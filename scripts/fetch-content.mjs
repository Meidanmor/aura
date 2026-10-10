/**
 * Puts this store's published files into public/ before the build.
 *
 * Platform stores (created by the qwoo-platform plugin) share this code repo.
 * Their published files (public/config, public/data, public/sections,
 * public/homepage-hero, public/branding, public/icons ...) come from:
 *
 *   - the store itself, once it publishes there (qwoo-core's
 *     Qwoo_Site_Content). The storefront then reads them while it runs
 *     (src-ssr/site-content.js); the copy built in is only a fallback and
 *     gives the build the store's name, colours and languages. Needs
 *     WP_BACKEND_URL and PROXY_SHARED_SECRET (already set for the server).
 *   - else the store's private content repo on GitHub (older store plugins):
 *       CONTENT_REPO            "Org/store-acme"
 *       QWOO_CONTENT_TOKEN_URL  platform endpoint that returns a read-only token
 *       QWOO_CONTENT_KEY        this store's key for that endpoint (Sensitive)
 *
 * Without CONTENT_REPO (local development, the original Aura site) it does
 * nothing, so public/ is used as it is in this repo.
 *
 * A failure on the GitHub path stops the build: deploying the code repo's own
 * content under another store's name would be worse than not deploying.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const { CONTENT_REPO, QWOO_CONTENT_TOKEN_URL, QWOO_CONTENT_KEY, WP_BACKEND_URL, PROXY_SHARED_SECRET } = process.env

/** Folders in public/ that belong to a store's content and are replaced as a whole. */
const CONTENT_DIRS = ['config', 'data', 'sections', 'homepage-hero', 'branding', 'icons']
const CONTENT_RE = /^(config|data|sections|homepage-hero|branding|icons)\/[^/].*$|^favicon\.ico$/

class ContentError extends Error {}

function fail(message) {
  throw new ContentError(message)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Why a request failed, in words ("fetch failed" alone says nothing). */
function reason(err) {
  const cause = err?.cause
  return [err?.message, cause?.code, cause?.message].filter(Boolean).join(' — ')
}

/**
 * fetch() with a few tries for network errors and "busy" answers (429, 5xx,
 * GitHub's 403 rate limit), waiting as long as the server asks (up to a
 * minute). `step` names the request in errors.
 */
async function fetchWithRetry(step, url, options = {}, tries = 4) {
  let last = ''
  for (let attempt = 1; attempt <= tries; attempt++) {
    let res
    try {
      res = await fetch(url, { ...options, signal: AbortSignal.timeout(60000) })
    } catch (err) {
      last = reason(err)
    }
    if (res) {
      const limited = res.status === 429 || (res.status === 403 && (res.headers.get('x-ratelimit-remaining') === '0' || res.headers.get('retry-after')))
      if (res.ok || (!limited && res.status < 500)) return res
      last = `HTTP ${res.status}`
      const wait = Number(res.headers.get('retry-after'))
      if (attempt < tries && Number.isFinite(wait) && wait > 0) {
        console.log(`[content] ${step}: busy (${last}), trying again in ${Math.min(wait, 60)}s.`)
        await sleep(Math.min(wait, 60) * 1000)
        continue
      }
    }
    if (attempt < tries) {
      console.log(`[content] ${step}: ${last}, trying again.`)
      await sleep(attempt * 3000)
    }
  }
  fail(`${step} failed after ${tries} tries: ${last}`)
}

/** Empties the content folders (and favicon.ico) of public/. */
function clearContent(target) {
  for (const dir of CONTENT_DIRS) fs.rmSync(path.join(target, dir), { recursive: true, force: true })
  fs.rmSync(path.join(target, 'favicon.ico'), { force: true })
}

/**
 * The store's published files, from the store. true when the store publishes
 * there (and they're in public/ now), false when it doesn't yet.
 */
async function fromStore() {
  if (!WP_BACKEND_URL || !PROXY_SHARED_SECRET) return false
  const backend = WP_BACKEND_URL.replace(/\/+$/, '')

  let pointer
  try {
    const res = await fetchWithRetry('Asking the store for its published files', `${backend}/wp-json/qwoo/v1/site`, {
      headers: { 'x-proxy-secret': PROXY_SHARED_SECRET },
    }, 3)
    if (!res.ok) return false // an older store plugin: no such route
    pointer = await res.json()
  } catch (err) {
    console.log(`[content] ${err instanceof ContentError ? err.message : reason(err)}: using the content repo.`)
    return false
  }
  if (!pointer?.version || !/^https?:\/\//.test(pointer.manifest || '') || !/^https?:\/\//.test(pointer.files || '')) return false

  const res = await fetchWithRetry('Downloading the published version', pointer.manifest)
  if (!res.ok) fail(`Downloading the published version failed (HTTP ${res.status}).`)
  const manifest = await res.json()
  if (manifest?.version !== pointer.version || !manifest.files) fail('The store sent another version than the live one.')

  const target = path.resolve('public')
  clearContent(target)

  const entries = Object.entries(manifest.files).filter(([rel]) => CONTENT_RE.test(rel) && !rel.includes('..'))
  const json = manifest.json || {}
  let missing = 0
  // A few at a time: the store is a shared host.
  for (let i = 0; i < entries.length; i += 6) {
    await Promise.all(entries.slice(i, i + 6).map(async ([rel, file]) => {
      const out = path.join(target, rel)
      fs.mkdirSync(path.dirname(out), { recursive: true })
      if (Object.prototype.hasOwnProperty.call(json, rel)) {
        fs.writeFileSync(out, JSON.stringify(json[rel], null, 2))
        return
      }
      try {
        const r = await fetchWithRetry(`Downloading ${rel}`, `${pointer.files}${file.sha}.${file.ext}`, {}, 2)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()))
      } catch (err) {
        // The storefront serves it from the store anyway; only the built-in copy lacks it.
        missing++
        console.log(`[content] ${rel}: ${reason(err)} (left out of the built-in copy).`)
      }
    }))
  }

  console.log(`[content] Using the store's published version ${pointer.version} (${entries.length - missing} files${missing ? `, ${missing} left out` : ''}).`)
  return true
}

/** The store's content repo on GitHub (stores that don't publish on the store yet). */
async function fromRepo() {
  if (!QWOO_CONTENT_TOKEN_URL || !QWOO_CONTENT_KEY) {
    fail('CONTENT_REPO is set but QWOO_CONTENT_TOKEN_URL or QWOO_CONTENT_KEY is missing.')
  }

  // 1. Read-only token for the content repo, from the platform.
  const tokenRes = await fetchWithRetry('Getting a content token from the platform', QWOO_CONTENT_TOKEN_URL, {
    method: 'POST',
    headers: { 'X-Qwoo-Content-Key': QWOO_CONTENT_KEY },
  })
  if (!tokenRes.ok) fail(`The platform refused the content token (HTTP ${tokenRes.status}).`)
  const { token, owner, repo, branch = 'main' } = await tokenRes.json()
  if (!token || `${owner}/${repo}`.toLowerCase() !== CONTENT_REPO.toLowerCase()) {
    fail('The platform returned a token for a different repo.')
  }

  // 2. The repo as a tarball.
  const apiBase = process.env.QWOO_GITHUB_API || 'https://api.github.com'
  const tarRes = await fetchWithRetry(`Downloading ${CONTENT_REPO} from GitHub`, `${apiBase}/repos/${owner}/${repo}/tarball/${encodeURIComponent(branch)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'qwoo-storefront-build',
    },
  })
  if (!tarRes.ok) fail(`Downloading ${CONTENT_REPO} failed (HTTP ${tarRes.status}).`)

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qwoo-content-'))
  fs.writeFileSync(path.join(tmp, 'content.tar.gz'), Buffer.from(await tarRes.arrayBuffer()))

  // GitHub tarballs wrap everything in one "<owner>-<repo>-<sha>/" folder.
  // Relative paths (run inside tmp): some tar builds read "C:\..." as a host name.
  const extracted = path.join(tmp, 'repo')
  fs.mkdirSync(extracted)
  execFileSync('tar', ['-xzf', 'content.tar.gz', '-C', 'repo', '--strip-components=1'], { cwd: tmp })

  const source = path.join(extracted, 'public')
  if (!fs.existsSync(path.join(source, 'config'))) {
    fail(`${CONTENT_REPO} has no public/config folder.`)
  }

  // 3. Replace the content folders, so nothing from the code repo's own
  // content (or an older version) is left behind. Only these folders are
  // copied: anything else in the content repo (e.g. .well-known app links)
  // can't override the storefront's own files.
  const target = path.resolve('public')
  clearContent(target)
  for (const dir of CONTENT_DIRS) {
    if (fs.existsSync(path.join(source, dir))) {
      fs.cpSync(path.join(source, dir), path.join(target, dir), { recursive: true })
    }
  }
  // favicon.ico sits at the public root: the store's own, or none (not this
  // repo's, which belongs to the original Aura site).
  if (fs.existsSync(path.join(source, 'favicon.ico'))) {
    fs.copyFileSync(path.join(source, 'favicon.ico'), path.join(target, 'favicon.ico'))
  }
  fs.rmSync(tmp, { recursive: true, force: true })

  console.log(`[content] Using ${CONTENT_REPO}@${branch}.`)
}

async function main() {
  // Only a platform store's build (never a local one: public/ is this repo's own content).
  if (!CONTENT_REPO) {
    console.log('[content] CONTENT_REPO not set — using public/ from this repo.')
    return
  }
  if (await fromStore()) return
  await fromRepo()
}

// No process.exit() here: let open connections close, then exit with the code.
main().catch((err) => {
  console.error(`[content] ${err instanceof ContentError ? err.message : reason(err) || err?.stack || err}`)
  process.exitCode = 1
})
