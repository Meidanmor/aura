/**
 * The store's published files (configs, pages, section and branding images,
 * icons, the products backup), read while the storefront runs instead of
 * being built in. Publishing writes them on the store (qwoo-core's
 * Qwoo_Site_Content) and they're live within seconds: no build, no GitHub.
 *
 * How it stays fast:
 *   - The live version (all config files in one download) is kept in memory.
 *     Nothing waits for the store once a server instance has it.
 *   - Which version is live is checked at most every CHECK_MS (a request
 *     waits up to CHECK_WAIT_MS for it), through this site's own CDN
 *     (/__site/current, cached 2 seconds), so the store itself is asked about
 *     once per few seconds whatever the traffic.
 *   - A version (/__site/m/{version}) and images named by attachment
 *     (/branding/12-logo.png) never change: the CDN keeps them for a year.
 *
 * A store that hasn't published here yet (an older store plugin) answers
 * { version: null }: then nothing changes, and the files built into the
 * deployment are served as before.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const BACKEND = (process.env.WP_BACKEND_URL || '').replace(/\/+$/, '')
const SECRET = process.env.PROXY_SHARED_SECRET || ''

/** Tells the store this storefront reads its published files (it switches publishing over). */
const STOREFRONT_VERSION = '2'
const CHECK_MS = 3000
const CHECK_WAIT_MS = 500
const NOT_YET_MS = 10000
const FAILED_MS = 60000
const TIMEOUT_MS = 5000
const VERSION_RE = /^[a-f0-9]{20,40}$/

/** Folders and root files of the store's content (the same list as the store's). */
const CONTENT_RE = /^(config|data|sections|homepage-hero|branding|icons)\/[^?#]+$|^favicon\.ico$/
/** Named after their attachment ("12-logo.png"): a new image is a new address. */
const STABLE_RE = /^(sections|branding|homepage-hero)\/\d+-[^/]+$/
/** Requests that never need the published files. */
const SKIP_RE = /^\/(assets|wp-json|wp-admin|_quasar|js|css|fonts)\/|^\/(sw|service-worker)\.js$/

const TYPES = {
  json: 'application/json; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  mp4: 'video/mp4',
  webm: 'video/webm',
  txt: 'text/plain; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
}

let pointer = null // { version, manifest, files }; version null: nothing published on the store yet
let checkedAt = 0
let nextCheck = 0
let checking = null
let site = null // the live version (see build())

/* ---------------- the live version ---------------- */

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`${url} answered ${res.status}`)
  return res.json()
}

const httpUrl = (value) => (typeof value === 'string' && /^https?:\/\//.test(value) ? value : '')

/** Which version is live, from the store itself. */
async function pointerFromStore() {
  const data = await getJson(`${BACKEND}/wp-json/qwoo/v1/site`, {
    'x-proxy-secret': SECRET,
    'x-qwoo-storefront': STOREFRONT_VERSION,
  })
  return {
    version: VERSION_RE.test(data?.version || '') ? data.version : null,
    manifest: httpUrl(data?.manifest),
    files: httpUrl(data?.files),
  }
}

function build(data, p) {
  const json = data.json && typeof data.json === 'object' ? data.json : {}
  const pwa = json['config/pwa.json'] || {}
  const languages = json['config/languages.json']
  return {
    version: p.version,
    filesBase: p.files,
    files: data.files && typeof data.files === 'object' ? data.files : {},
    json,
    languages: languages && typeof languages === 'object' ? languages : null,
    name: String(pwa.name || ''),
    description: String(pwa.description || ''),
  }
}

const asPointer = (data) => ({
  version: VERSION_RE.test(data?.version || '') ? data.version : null,
  manifest: httpUrl(data?.manifest),
  files: httpUrl(data?.files),
})

/**
 * Through this site's CDN, else from the store. race: ask both at once and
 * take the first answer (a new server instance's first request waits for it).
 */
async function viaCdn(cdnUrl, storeCall, race) {
  if (!cdnUrl) return storeCall()
  const cdn = getJson(cdnUrl)
  if (race) return Promise.any([cdn, storeCall()])
  try {
    return await cdn
  } catch {
    return storeCall()
  }
}

async function loadVersion(p, origin, race) {
  const check = (data) => {
    if (data?.version !== p.version) throw new Error('the store sent another version')
    return data
  }
  const data = await viaCdn(
    origin ? `${origin}/__site/m/${p.version}` : '',
    async () => check(await getJson(p.manifest)),
    race,
  ).then(check)
  site = build(data, p)
}

function refresh(origin) {
  if (!checking) {
    const race = !checkedAt
    let wait = CHECK_MS
    checking = (async () => {
      const p = asPointer(await viaCdn(origin ? `${origin}/__site/current` : '', pointerFromStore, race))
      if (p.version && p.version !== site?.version) await loadVersion(p, origin, race)
      pointer = p
      // Nothing published on the store yet: no need to ask as often.
      if (!p.version) wait = NOT_YET_MS
    })()
      .catch((err) => {
        // An older store plugin (no such route), or the store is down: ask again in a minute.
        wait = FAILED_MS
        console.error('[site] checking the published version failed:', err?.message || err)
      })
      .finally(() => {
        checkedAt = Date.now()
        nextCheck = checkedAt + wait
        checking = null
      })
  }
  return checking
}

/**
 * The live version, or null (nothing published on the store: the built-in
 * files are used). Only the very first request of a server instance waits.
 */
export async function currentSite(origin = '') {
  if (!BACKEND) return null
  if (!checkedAt) await refresh(origin)
  // Due for a check: wait for it briefly (usually a CDN hit), so a page right
  // after a publish shows it; a slow answer finishes in the background.
  else if (Date.now() > nextCheck) await Promise.race([refresh(origin), new Promise((resolve) => setTimeout(resolve, CHECK_WAIT_MS))])
  return pointer?.version && site ? site : null
}

/** The page's view of the live version, for the browser (window.__QWOO_SITE__). */
export function clientSite(s) {
  return s ? { version: s.version, languages: s.languages, name: s.name, description: s.description } : null
}

/* ---------------- serving the files ---------------- */

// Files already fetched from the store (by content: they never change).
const bytesCache = new Map()
let bytesCached = 0
const BYTES_LIMIT = 32 * 1024 * 1024

async function fileBytes(s, file) {
  const key = `${file.sha}.${file.ext}`
  const hit = bytesCache.get(key)
  if (hit) {
    bytesCache.delete(key)
    bytesCache.set(key, hit) // most recently used last
    return hit
  }
  const res = await fetch(`${s.filesBase}${key}`, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`the store answered ${res.status} for ${key}`)
  const bytes = Buffer.from(await res.arrayBuffer())
  if (bytes.length < BYTES_LIMIT / 4) {
    bytesCache.set(key, bytes)
    bytesCached += bytes.length
    for (const [k, v] of bytesCache) {
      if (bytesCached <= BYTES_LIMIT) break
      bytesCache.delete(k)
      bytesCached -= v.length
    }
  }
  return bytes
}

function cacheHeaders(res, rel, ext) {
  if (STABLE_RE.test(rel)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('Vercel-CDN-Cache-Control', 'max-age=31536000, immutable')
  } else if (ext === 'json') {
    // Always asked again (the answer is quick, from memory); the ETag saves the download.
    res.setHeader('Cache-Control', 'no-cache')
  } else {
    // Icons and the favicon keep their names when they change.
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
    res.setHeader('Vercel-CDN-Cache-Control', 'max-age=60, stale-while-revalidate=86400')
  }
}

async function serveFile(req, res, s, rel, file) {
  const ext = String(file.ext || 'bin')
  const etag = `"${file.sha}"`
  res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream')
  res.setHeader('ETag', etag)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  // An SVG opened on its own never runs anything (as an <img> nothing changes).
  if (ext === 'svg') res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox")
  cacheHeaders(res, rel, ext)

  if (req.headers['if-none-match'] === etag) return res.status(304).end()

  let body
  if (Object.prototype.hasOwnProperty.call(s.json, rel)) {
    body = Buffer.from(JSON.stringify(s.json[rel]))
  } else {
    try {
      body = await fileBytes(s, file)
    } catch (err) {
      console.error('[site]', err?.message || err)
      res.setHeader('Cache-Control', 'no-store')
      res.removeHeader('Vercel-CDN-Cache-Control')
      return res.status(502).end()
    }
  }
  res.setHeader('Content-Length', body.length)
  return req.method === 'HEAD' ? res.end() : res.end(body)
}

/* The installable app's manifest: the built one with the store's name, colours and icons. */
let builtManifest = null
function webManifest(s, publicDir) {
  if (!builtManifest) {
    try {
      builtManifest = JSON.parse(readFileSync(join(publicDir, 'manifest.json'), 'utf-8'))
    } catch {
      builtManifest = { display: 'standalone', icons: [] }
    }
  }
  const out = { ...builtManifest }
  for (const [key, value] of Object.entries(s.json['config/pwa.json'] || {})) {
    if (value !== undefined && value !== null && value !== '') out[key] = value
  }
  const has = (src) => !!s.files[String(src || '').replace(/^\//, '')]
  const own = s.json['config/icons.json']?.icons
  const icons = Array.isArray(own) && own.length ? own : builtManifest.icons || []
  out.icons = icons.filter((icon) => has(icon.src))
  return out
}

function originOf(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  return host ? `${proto}://${host}` : ''
}

/**
 * Express middleware (before the static files): /__site/* for the CDN, the
 * store's content paths, and /manifest.json. Every other request continues,
 * with the live version in globalThis.__QWOO_SITE for the page render
 * (config-loader.js, i18n, render.js).
 */
export function siteContentMiddleware({ publicDir }) {
  return async (req, res, next) => {
    if (!BACKEND || (req.method !== 'GET' && req.method !== 'HEAD') || SKIP_RE.test(req.path)) return next()

    try {
      // Which version is live: cached by the CDN for a few seconds.
      if (req.path === '/__site/current') {
        const p = await pointerFromStore()
        res.setHeader('Cache-Control', 'no-store')
        // Never an older answer than that (no stale-while-revalidate): a publish shows within seconds.
        res.setHeader('Vercel-CDN-Cache-Control', 'max-age=2')
        return res.json(p)
      }
      // A version never changes: cached for good.
      const m = req.path.match(/^\/__site\/m\/([a-f0-9]{20,40})$/)
      if (m) {
        if (!pointer?.manifest) await refresh('')
        const url = pointer?.manifest ? pointer.manifest.replace(/[a-f0-9]{20,40}\.json$/, `${m[1]}.json`) : ''
        const upstream = url ? await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) }) : null
        if (!upstream?.ok) {
          res.setHeader('Cache-Control', 'no-store')
          return res.status(404).end()
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.setHeader('Vercel-CDN-Cache-Control', 'max-age=31536000, immutable')
        return res.end(Buffer.from(await upstream.arrayBuffer()))
      }
    } catch (err) {
      console.error('[site]', err?.message || err)
      res.setHeader('Cache-Control', 'no-store')
      return res.status(502).end()
    }

    const s = await currentSite(originOf(req))
    // One store per deployment: the render reads it from here.
    globalThis.__QWOO_SITE = s
    if (!s) return next()

    if (req.path === '/manifest.json') {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
      res.setHeader('ETag', `"${s.version}"`)
      if (req.headers['if-none-match'] === `"${s.version}"`) return res.status(304).end()
      return res.end(JSON.stringify(webManifest(s, publicDir)))
    }

    let rel = ''
    try {
      rel = decodeURIComponent(req.path).replace(/^\/+/, '')
    } catch {
      return next()
    }
    if (!CONTENT_RE.test(rel) || rel.includes('..')) return next()
    const file = s.files[rel]
    if (!file) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(404).end()
    }
    return serveFile(req, res, s, rel, file)
  }
}
