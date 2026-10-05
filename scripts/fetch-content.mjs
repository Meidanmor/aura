/**
 * Downloads this store's content repo into public/ before the build.
 *
 * Platform stores (created by the qwoo-platform plugin) share this code repo,
 * and each has a private content repo with its published files
 * (public/config, public/data, public/sections, public/homepage-hero,
 * public/branding, public/icons ...). Their Vercel projects set:
 *
 *   CONTENT_REPO            "Org/store-acme"
 *   QWOO_CONTENT_TOKEN_URL  platform endpoint that returns a read-only token
 *   QWOO_CONTENT_KEY        this store's key for that endpoint (Sensitive)
 *
 * Without them (local development, the original Aura site) it does nothing,
 * so public/ is used as it is in this repo.
 *
 * With them, a failure stops the build: deploying the code repo's own
 * content under another store's name would be worse than not deploying.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const { CONTENT_REPO, QWOO_CONTENT_TOKEN_URL, QWOO_CONTENT_KEY } = process.env

/** Folders in public/ that belong to a store's content and are replaced as a whole. */
const CONTENT_DIRS = ['config', 'data', 'sections', 'homepage-hero', 'branding', 'icons']

class ContentError extends Error {}

function fail(message) {
  throw new ContentError(message)
}

async function main() {
  if (!CONTENT_REPO) {
    console.log('[content] CONTENT_REPO not set — using public/ from this repo.')
    return
  }
  if (!QWOO_CONTENT_TOKEN_URL || !QWOO_CONTENT_KEY) {
    fail('CONTENT_REPO is set but QWOO_CONTENT_TOKEN_URL or QWOO_CONTENT_KEY is missing.')
  }

  // 1. Read-only token for the content repo, from the platform.
  const tokenRes = await fetch(QWOO_CONTENT_TOKEN_URL, {
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
  const tarRes = await fetch(`${apiBase}/repos/${owner}/${repo}/tarball/${encodeURIComponent(branch)}`, {
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
  for (const dir of CONTENT_DIRS) {
    fs.rmSync(path.join(target, dir), { recursive: true, force: true })
    if (fs.existsSync(path.join(source, dir))) {
      fs.cpSync(path.join(source, dir), path.join(target, dir), { recursive: true })
    }
  }
  // favicon.ico sits at the public root: the store's own, or none (not this
  // repo's, which belongs to the original Aura site).
  fs.rmSync(path.join(target, 'favicon.ico'), { force: true })
  if (fs.existsSync(path.join(source, 'favicon.ico'))) {
    fs.copyFileSync(path.join(source, 'favicon.ico'), path.join(target, 'favicon.ico'))
  }
  fs.rmSync(tmp, { recursive: true, force: true })

  console.log(`[content] Using ${CONTENT_REPO}@${branch}.`)
}
// No process.exit() here: let open connections close, then exit with the code.
main().catch((err) => {
  console.error(`[content] ${err instanceof ContentError ? err.message : err?.stack || err}`)
  process.exitCode = 1
})
