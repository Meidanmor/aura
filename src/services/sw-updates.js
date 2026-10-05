/**
 * Keeps the service worker (and the published JSON it precaches) up to date
 * while the app is open.
 *
 * The published JSON (public/config/*.json, public/data/*.json) is fetched
 * fresh by the SW and saved for offline (custom-service-worker.js). When a
 * file changed, the SW sends JSON_UPDATED and we dispatch JSON_UPDATED_EVENT
 * with the changed files, so what's already on screen (layout header/footer/
 * branding, the current page) refreshes in place. Since the layout doesn't
 * refetch its files, we ask the SW to recheck its saved JSON on route changes
 * and when the tab becomes visible (throttled).
 *
 * The app's code is precached, and a new deploy produces a new SW, which the
 * browser only looks for on full page loads. So we also check for a new SW
 * before route changes (throttled), when the tab becomes visible and on a
 * slow interval.
 */

export const JSON_UPDATED_EVENT = 'qwoo:json-updated'

const CHECK_GAP_MS = 30 * 1000          // min time between two update checks
const NAVIGATION_WAIT_MS = 4000         // max delay a navigation waits for a new SW
const POLL_INTERVAL_MS = 15 * 60 * 1000

let registration = null
let knownRevisions = null
let lastCheck = 0
let pendingCheck = null
let initialized = false

function waitForActivation(worker, timeout) {
  return new Promise(resolve => {
    if (!worker || timeout <= 0) return resolve(false)
    const done = (activated) => {
      clearTimeout(timer)
      worker.removeEventListener('statechange', onChange)
      resolve(activated)
    }
    const onChange = () => {
      if (worker.state === 'activated') done(true)
      else if (worker.state === 'redundant') done(false)
    }
    const timer = setTimeout(() => done(false), timeout)
    worker.addEventListener('statechange', onChange)
    onChange()
  })
}

/**
 * Asks the browser to look for a new SW (at most once per CHECK_GAP_MS).
 * With `wait` > 0, also waits up to that long for a found update to activate.
 */
export async function checkForSwUpdate(wait = 0) {
  if (!registration) return

  if (!pendingCheck && Date.now() - lastCheck >= CHECK_GAP_MS) {
    lastCheck = Date.now()
    // Rejects when offline — nothing to do then.
    pendingCheck = registration.update().catch(() => {}).finally(() => { pendingCheck = null })
  }
  if (wait <= 0) return

  const deadline = Date.now() + wait
  if (pendingCheck) {
    await Promise.race([pendingCheck, new Promise(r => setTimeout(r, wait))])
  }
  const worker = registration.installing || registration.waiting
  if (worker) await waitForActivation(worker, deadline - Date.now())
}

let lastRevalidate = 0
let primed = false

// Files the layout shows on every page. They come from the server-rendered
// first load, so the browser never fetches them itself; fetching them once
// through the SW saves the copy that later rechecks compare against.
const LAYOUT_JSON = ['/config/branding.json', '/config/header.json', '/config/footer.json']

function primeLayoutJson() {
  if (primed || !navigator.serviceWorker?.controller) return
  primed = true
  LAYOUT_JSON.forEach(url => fetch(url, { cache: 'no-store' }).catch(() => {}))
}

/**
 * Asks the service worker to recheck the published JSON it has saved (at
 * most once per CHECK_GAP_MS). Changed files come back as JSON_UPDATED.
 */
export function revalidatePublishedJson() {
  const worker = navigator.serviceWorker?.controller
  if (!worker || Date.now() - lastRevalidate < CHECK_GAP_MS) return
  lastRevalidate = Date.now()
  worker.postMessage({ type: 'REVALIDATE_JSON' })
}

function changedFiles(previous, next) {
  const urls = new Set([...Object.keys(previous), ...Object.keys(next)])
  return [...urls].filter(url => previous[url] !== next[url])
}

/** Tells on-screen components that published JSON changed ('/config/home.json' → page 'home'). */
function announce(urls) {
  const pages = urls
    .map(url => url.match(/^\/config\/([^/]+)\.json$/)?.[1])
    .filter(Boolean)
  window.dispatchEvent(new CustomEvent(JSON_UPDATED_EVENT, { detail: { urls, pages } }))
}

function onSwMessage({ data }) {
  // The service worker fetched a published JSON file and it had changed.
  if (data?.type === 'JSON_UPDATED') {
    if (Array.isArray(data.urls) && data.urls.length) announce(data.urls)
    return
  }
  if (data?.type === 'JSON_REVISIONS') {
    if (!knownRevisions) knownRevisions = data.revisions || {}
    return
  }
  if (data?.type !== 'SW_ACTIVATED') return

  const previous = knownRevisions
  knownRevisions = data.revisions || {}
  // First install, or the previous SW predates revision reporting.
  if (!previous) return

  const urls = changedFiles(previous, knownRevisions)
  if (urls.length) announce(urls)
}

function isChunkLoadError(err) {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i
    .test(err?.message || '')
}

export function initSwUpdates(router) {
  if (initialized || typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  initialized = true

  navigator.serviceWorker.addEventListener('message', onSwMessage)

  navigator.serviceWorker.ready.then(reg => {
    registration = reg
    navigator.serviceWorker.controller?.postMessage({ type: 'GET_JSON_REVISIONS' })
    primeLayoutJson()
  }).catch(() => {})
  // First visit: the new worker takes control a moment after installing.
  navigator.serviceWorker.addEventListener('controllerchange', primeLayoutJson)

  router.beforeEach(async (to, from) => {
    // Initial load is already fresh from SSR; don't delay hydration.
    if (!from.matched.length || to.path === from.path) return
    revalidatePublishedJson()
    await checkForSwUpdate(NAVIGATION_WAIT_MS)
  })

  // A new deploy removes the old build's JS chunks. If this tab still runs
  // the old build, load the target page fresh instead of failing.
  router.onError((err, to) => {
    if (!isChunkLoadError(err) || !to?.fullPath) return
    let alreadyRetried = false
    try {
      alreadyRetried = sessionStorage.getItem('qwoo:chunk-reload') === to.fullPath
      sessionStorage.setItem('qwoo:chunk-reload', to.fullPath)
    } catch { /* storage unavailable */ }
    if (alreadyRetried) return
    // Only ever reload to a page on this site (a path like "//other.site"
    // would otherwise be read as another host).
    let target
    try {
      target = new URL(to.fullPath, window.location.origin)
    } catch {
      return
    }
    if (target.origin === window.location.origin) window.location.assign(target.href)
  })
  router.afterEach(() => {
    try { sessionStorage.removeItem('qwoo:chunk-reload') } catch { /* storage unavailable */ }
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    revalidatePublishedJson()
    checkForSwUpdate()
  })
  setInterval(() => {
    revalidatePublishedJson()
    checkForSwUpdate()
  }, POLL_INTERVAL_MS)
}
