/**
 * Native app (Capacitor) only — registered in quasar.config.js `boot` for
 * the capacitor build, never for the web/SSR build.
 *
 * The app's pages are served from inside the device (https://localhost), so
 * relative requests like fetch('/wp-json/...') or fetch('/config/home.json')
 * would never leave the phone. This routes them:
 *
 *   /wp-json/...     to the live storefront's proxy (APP_API_ORIGIN), which
 *                    adds the WordPress proxy secret server-side — exactly
 *                    like the website. No secret ships in the app.
 *
 *   /config, /data   LIVE FIRST, with offline fallbacks:
 *                      1. the live storefront (timeout LIVE_TIMEOUT_MS)
 *                      2. the last live copy saved on the device
 *                      3. the copy bundled in the app at build time
 *                    Every successful live response is saved (IndexedDB).
 *
 *   images/videos    /sections, /homepage-hero, /branding, /icons — live;
 *                    the ones referenced by the published config are also
 *                    saved on the device in the background (capped at
 *                    MEDIA_LIMIT_BYTES), so they keep working offline. While
 *                    content is offline, image paths in the JSON point at
 *                    the saved copy (blob: URL) or the bundled file.
 *
 * Capacitor's native HTTP (CapacitorHttp in capacitor.config.json) performs
 * the cross-origin requests natively: no CORS, and cookies are kept in the
 * device's cookie store for the storefront domain.
 */
import {
  LIVE_PATH_PREFIXES, MEDIA_PATH_PREFIXES, liveOrigin, absolutizeLivePaths,
  setContentOffline, registerOfflineMedia, getOfflineMedia,
} from 'src/utils/native-app'
import { idbGet, idbPut, idbDelete, idbEntries, JSON_STORE, MEDIA_STORE } from 'src/utils/offline-store'
import { startWatchdog, track, mark } from 'src/utils/startup-watchdog'

const LIVE_TIMEOUT_MS = 6000
// Read-only API calls (products, SEO, cart...) — generous, but bounded: a
// request that never settles would otherwise hold up whatever awaits it,
// including the app's startup.
const API_READ_TIMEOUT_MS = 20000
const MEDIA_TIMEOUT_MS = 30000
const MEDIA_LIMIT_BYTES = 60 * 1024 * 1024
const MEDIA_SYNC_DELAY_MS = 4000
const MEDIA_EXT = /\.(png|jpe?g|webp|avif|gif|svg|ico|mp4|webm)$/i

/** Everything the app may show offline — refreshed whenever it's online. */
const CONTENT_FILES = [
  '/config/branding.json', '/config/header.json', '/config/footer.json', '/config/home.json',
  '/config/shop.json', '/config/category.json', '/config/product.json', '/config/checkout.json',
  '/config/icons.json', '/data/products.json', '/data/categories.json', '/data/price-meta.json',
]

/** Config fields holding a WordPress image URL that the storefront mirrors locally. */
const MIRRORED_FIELDS = { hero_image: '/homepage-hero/', logo: '/branding/', app_icon: '/branding/' }

const isContentJson = (pathname) => /^\/(config|data)\/[^/]+\.json$/.test(pathname)
const isMedia = (pathname) => MEDIA_PATH_PREFIXES.some((p) => pathname.startsWith(p))

function withTimeout(promise, ms) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), ms) }),
  ]).finally(() => clearTimeout(timer))
}

const jsonResponse = (data) => new Response(JSON.stringify(data), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
})

/** Image/video paths referenced by a published JSON document. */
function collectMedia(value, key, out) {
  if (typeof value === 'string') {
    const path = value.split('?')[0]
    if (isMedia(path) && MEDIA_EXT.test(path)) {
      out.add(path)
    } else if (MIRRORED_FIELDS[key] && /^https?:\/\//i.test(path)) {
      const name = path.split('/').pop()
      if (name && MEDIA_EXT.test(name)) out.add(MIRRORED_FIELDS[key] + name)
    }
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectMedia(v, key, out))
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => collectMedia(v, k, out))
  }
  return out
}

export default ({ router }) => {
  if (!window.Capacitor?.isNativePlatform?.()) return

  startWatchdog()
  router.isReady().then(() => mark('first page resolved'), (err) => mark(`first page failed: ${err?.message || err}`))

  const apiOrigin = liveOrigin()
  if (!apiOrigin) {
    console.error('[native-api] APP_API_ORIGIN is not set — API calls will fail. Set it in .env and rebuild the app.')
    return
  }

  const originalFetch = window.fetch.bind(window)

  /* ---------------- bundled copies ---------------- */

  const bundled = new Map() // path -> Promise<boolean>
  const bundledExists = (path) => {
    if (!bundled.has(path)) {
      bundled.set(path, originalFetch(path).then((r) => r.ok, () => false))
    }
    return bundled.get(path)
  }

  /* ---------------- offline media ---------------- */

  const resolved = new Set() // paths registered with a saved/bundled copy
  async function prepareOfflineMedia(paths) {
    await Promise.all([...paths].map(async (path) => {
      if (resolved.has(path)) return
      const saved = await idbGet(MEDIA_STORE, path)
      if (saved?.blob) {
        registerOfflineMedia(path, URL.createObjectURL(saved.blob))
        resolved.add(path)
      } else if (await bundledExists(path)) {
        registerOfflineMedia(path, path)
        resolved.add(path)
      } else if (!getOfflineMedia(path)) {
        // Nothing on the device: keep the live URL (the WebView's own HTTP
        // cache may still have it). Re-checked next time.
        registerOfflineMedia(path, apiOrigin + path)
      }
    }))
  }

  /* ---------------- background sync (when online) ---------------- */

  let syncTimer = null
  let syncing = false
  const scheduleSync = () => {
    clearTimeout(syncTimer)
    syncTimer = setTimeout(syncOfflineCopies, MEDIA_SYNC_DELAY_MS)
  }

  async function syncOfflineCopies() {
    if (syncing) return
    syncing = true
    try {
      // 1. Refresh every content file, so pages never opened work offline too.
      for (const path of CONTENT_FILES) {
        try {
          const res = await withTimeout(originalFetch(apiOrigin + path, { cache: 'no-store' }), LIVE_TIMEOUT_MS)
          if (!res.ok) continue
          const body = await res.text()
          JSON.parse(body) // only save valid JSON
          await idbPut(JSON_STORE, path, { body, time: Date.now() })
        } catch {
          return // offline again — try on the next successful load
        }
      }

      // 2. Images the saved config references; drop the ones no longer used.
      const wanted = new Set()
      for (const [path, entry] of await idbEntries(JSON_STORE)) {
        if (!String(path).startsWith('/config/')) continue
        try { collectMedia(JSON.parse(entry.body), '', wanted) } catch { /* skip corrupt entry */ }
      }

      let total = 0
      const have = new Set()
      for (const [path, entry] of await idbEntries(MEDIA_STORE)) {
        if (!wanted.has(path)) {
          await idbDelete(MEDIA_STORE, path)
          continue
        }
        have.add(path)
        total += entry.size || 0
      }

      // Published file names are unique per upload, so a saved file never
      // needs re-downloading — only the missing ones are fetched.
      const missing = [...wanted].filter((p) => !have.has(p))
      for (let i = 0; i < missing.length; i += 3) {
        await Promise.all(missing.slice(i, i + 3).map(async (path) => {
          if (total >= MEDIA_LIMIT_BYTES) return
          try {
            const res = await withTimeout(originalFetch(apiOrigin + path), MEDIA_TIMEOUT_MS)
            if (!res.ok) return
            const blob = await res.blob()
            if (!blob.size || total + blob.size > MEDIA_LIMIT_BYTES) return
            await idbPut(MEDIA_STORE, path, { blob, type: blob.type || res.headers.get('content-type') || '', size: blob.size, time: Date.now() })
            total += blob.size
          } catch { /* try again on the next sync */ }
        }))
      }
    } finally {
      syncing = false
    }
  }

  /* ---------------- request handlers ---------------- */

  async function loadContentJson(path, search, init) {
    try {
      const res = await withTimeout(originalFetch(apiOrigin + path + search, init), LIVE_TIMEOUT_MS)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.text()
      const data = JSON.parse(body)
      setContentOffline(false)
      idbPut(JSON_STORE, path, { body, time: Date.now() })
      scheduleSync()
      return jsonResponse(absolutizeLivePaths(data))
    } catch (err) {
      let body = (await idbGet(JSON_STORE, path))?.body
      let source = 'saved'
      if (!body) {
        try {
          const local = await originalFetch(path)
          if (local.ok) { body = await local.text(); source = 'bundled' }
        } catch { /* not bundled */ }
      }
      if (!body) throw err

      const data = JSON.parse(body)
      setContentOffline(true)
      await prepareOfflineMedia(collectMedia(data, '', new Set()))
      console.info(`[native-api] offline (${err.message}): ${path} from the ${source} copy`)
      mark(`offline (${err.message}): ${path} from the ${source} copy`)
      return jsonResponse(absolutizeLivePaths(data))
    }
  }

  async function loadMedia(path, search, init, method) {
    try {
      const res = await withTimeout(originalFetch(apiOrigin + path + search, init), LIVE_TIMEOUT_MS)
      if (res.ok || res.status === 404) return res
      throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      setContentOffline(true)
      await prepareOfflineMedia([path])
      const saved = await idbGet(MEDIA_STORE, path)
      if (saved?.blob) {
        return new Response(method === 'HEAD' ? null : saved.blob, {
          status: 200,
          headers: { 'Content-Type': saved.type || 'application/octet-stream' },
        })
      }
      if (await bundledExists(path)) return originalFetch(path, init)
      throw err
    }
  }

  /* ---------------- fetch routing ---------------- */

  window.fetch = (resource, init) => {
    const done = track(`fetch ${String(resource?.url || resource).replace(apiOrigin, '').slice(0, 120)}`)
    return routeFetch(resource, init).then(
      (res) => { done(res.status); return res },
      (err) => { done(err?.message || 'failed'); throw err },
    )
  }

  async function routeFetch(resource, init) {
    const isRequest = resource instanceof Request
    const raw = isRequest ? resource.url : (typeof resource === 'string' || resource instanceof URL ? String(resource) : null)
    if (raw === null) return originalFetch(resource, init)

    const url = new URL(raw, window.location.origin)
    if (url.origin !== window.location.origin || !LIVE_PATH_PREFIXES.some((p) => url.pathname.startsWith(p))) {
      return originalFetch(resource, init)
    }

    const method = String(init?.method || (isRequest ? resource.method : 'GET')).toUpperCase()
    const readOnly = method === 'GET' || method === 'HEAD'

    if (readOnly && !isRequest && isContentJson(url.pathname)) return loadContentJson(url.pathname, url.search, init)
    if (readOnly && !isRequest && isMedia(url.pathname)) return loadMedia(url.pathname, url.search, init, method)

    // API calls (and anything else live): straight to the storefront.
    const target = apiOrigin + url.pathname + url.search
    const request = originalFetch(isRequest ? new Request(target, resource) : target, init)
    return readOnly ? withTimeout(request, API_READ_TIMEOUT_MS) : request
  }
}
