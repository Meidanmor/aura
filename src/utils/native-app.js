/**
 * Helpers for the native app (Capacitor build). In the browser/SSR they're
 * no-ops: isNativeApp() is false and liveUrl() returns its input unchanged.
 *
 * The app's shell (JS/CSS/index.html) is bundled, but everything the Shop
 * Builder publishes — /config and /data JSON, section/hero/branding images,
 * icons — is always read from the live storefront (APP_API_ORIGIN), never
 * from the copies bundled at build time, so builder changes show up in the
 * app without an app update.
 */

/** Root-relative paths that are served live from the storefront. */
export const LIVE_PATH_PREFIXES = [
  '/wp-json/',
  '/config/',
  '/data/',
  '/sections/',
  '/homepage-hero/',
  '/branding/',
  '/icons/',
]

export function isNativeApp() {
  return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()
}

export function liveOrigin() {
  return process.env.APP_API_ORIGIN || ''
}

/** Published image/video folders (a subset of LIVE_PATH_PREFIXES). */
export const MEDIA_PATH_PREFIXES = ['/sections/', '/homepage-hero/', '/branding/', '/icons/']

/*
 * Offline media: when published content can't be loaded live, native-api.js
 * switches to "offline content" and registers, for each image/video path,
 * where to load it from instead — a saved copy on the device (blob: URL) or
 * the copy bundled in the app (the path itself).
 */
let contentOffline = false
const offlineMedia = new Map()

export function setContentOffline(value) { contentOffline = !!value }
export function isContentOffline() { return contentOffline }
export function registerOfflineMedia(path, url) { offlineMedia.set(path, url) }
export function getOfflineMedia(path) { return offlineMedia.get(path) }

/**
 * "/sections/a.png" -> "https://store.example/sections/a.png" in the app
 * (or its saved / bundled copy while content is offline).
 */
export function liveUrl(path) {
  if (!isNativeApp() || typeof path !== 'string') return path
  if (!path.startsWith('/') || path.startsWith('//')) return path
  if (!LIVE_PATH_PREFIXES.some((p) => path.startsWith(p))) return path
  if (contentOffline && offlineMedia.has(path)) return offlineMedia.get(path)
  const origin = liveOrigin()
  return origin ? origin + path : path
}

/**
 * Deep-copies published JSON, turning root-relative live paths (images,
 * videos...) into absolute storefront URLs — <img>/CSS can't be redirected
 * the way fetch() is, so the data itself must carry full URLs in the app.
 */
export function absolutizeLivePaths(value) {
  if (typeof value === 'string') return liveUrl(value)
  if (Array.isArray(value)) return value.map(absolutizeLivePaths)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = absolutizeLivePaths(v)
    return out
  }
  return value
}
