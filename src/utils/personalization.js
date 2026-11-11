/**
 * Audiences (dashboard → Marketing → Audiences, Pro and Plus).
 *
 * Only when the store has Audiences on (window.__QWOO_CODE__.audiences) and the
 * shopper allowed Analytics cookies: what they open, view, cart and save is
 * sent to the store in small batches (qwoo/v1/personalization/event); every
 * answer says which audiences this browser is in. Then:
 *   - sections and blocks with Show To "People in an audience" / "Everyone
 *     except an audience" (classes sb-au-in / sb-au-out + sb-au-{id}) show or
 *     hide through one <style> on the page, never through Vue, so the server's
 *     HTML and the first render stay the same;
 *   - popups ask audienceReady() / inAudience();
 *   - "For you" product lists read favouriteCategories().
 * A "no" to Analytics erases the store's row and stops everything.
 */
import { ref } from 'vue'
import { allowedNow } from 'src/utils/custom-code.js'
import { fetchWithToken } from 'src/composables/useApiFetch.js'

const ENDPOINT = '/wp-json/qwoo/v1/personalization/event'
const CACHE_KEY = 'qwoo_au'
const VISIT_KEY = 'qwoo_au_visit'
const SEEN_KEY = 'qwoo_au_seen'
const FLUSH_MS = 12000

let started = false
let on = false
let queue = []
let timer = null
let preview = null // Store builder "Preview as": [id] or null

/** The audiences this browser is in, and whether the store has answered yet. */
export const audiences = ref([])
export const audiencesKnown = ref(false)
const cats = ref([])
let readyResolvers = []

function analyticsAllowed() {
  return typeof window !== 'undefined' && !!allowedNow()?.analytics
}

const storeHasAudiences = () => typeof window !== 'undefined' && !!window.__QWOO_CODE__?.audiences

/* ---------------- showing audience-only content ---------------- */

function styleEl() {
  let el = document.getElementById('qwoo-au-style')
  if (!el) {
    el = document.createElement('style')
    el.id = 'qwoo-au-style'
    document.head.appendChild(el)
  }
  return el
}

const safeId = (id) => (/^[a-z0-9_]{1,24}$/.test(id) ? id : '')

/** One rule for the whole page: "in" content not for these audiences hides, "out" content for them hides. */
function applyMembership() {
  if (typeof document === 'undefined') return
  const ids = (preview || audiences.value).map(safeId).filter(Boolean)
  const root = document.documentElement
  root.classList.add('qa-au')
  root.classList.toggle('qa-au-preview', !!preview)
  const scope = preview ? 'html.qa-au' : 'html.qa-au:not(.qa-editor)'
  const notIn = ids.map((id) => `:not(.sb-au-${id})`).join('')
  const out = ids.map((id) => `${scope} .sb-au-out.sb-au-${id}`).join(',')
  styleEl().textContent = `${scope} .sb-au-in${notIn}{display:none!important}` + (out ? `${out}{display:none!important}` : '')
  if (!preview) setTimeout(noteSeen, 300)
}

function setMembership(list, favourites) {
  audiences.value = Array.isArray(list) ? list.filter((id) => typeof id === 'string').slice(0, 50) : []
  if (Array.isArray(favourites)) cats.value = favourites.map(Number).filter((n) => Number.isSafeInteger(n) && n > 0).slice(0, 12)
  audiencesKnown.value = true
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ a: audiences.value, c: cats.value, t: Date.now() })) } catch { /* private mode */ }
  applyMembership()
  for (const r of readyResolvers) r()
  readyResolvers = []
}

/** Resolves once the store said which audiences this is (or at once when Audiences can't run here). */
export function audienceReady(timeoutMs = 4000) {
  if (audiencesKnown.value || !on) return Promise.resolve()
  return new Promise((resolve) => {
    readyResolvers.push(resolve)
    setTimeout(resolve, timeoutMs)
  })
}

export const inAudience = (id) => !!id && (preview || audiences.value).includes(id)

/** The visitor's favourite categories, best first ("For you"). */
export const favouriteCategories = () => cats.value.slice()

/* ---------------- sending ---------------- */

function deviceKind() {
  const w = window.innerWidth || 1024
  const touch = navigator.maxTouchPoints > 0
  if (w < 768) return 'phone'
  if (touch && w < 1200) return 'tablet'
  return 'computer'
}

const SOURCE_HOSTS = [
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(facebook|fb)\.(com|me)$|(^|\.)messenger\.com$/, 'facebook'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)google\.[a-z.]+$/, 'google'],
  [/(^|\.)(bing|duckduckgo|yahoo|yandex|baidu|ecosia)\.[a-z.]+$/, 'search'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'whatsapp'],
  [/(^|\.)(mail\.google|outlook\.live|mail\.yahoo)\.com$/, 'email'],
]

/** Where this visit came from: { src, camp, ref }. */
function visitSource() {
  const p = new URLSearchParams(window.location.search)
  const utm = (p.get('utm_source') || '').toLowerCase()
  const medium = (p.get('utm_medium') || '').toLowerCase()
  const camp = (p.get('utm_campaign') || '').slice(0, 60)
  if (p.get('gclid')) return { src: 'google', camp, ref: '' }
  if (utm) {
    const known = ['instagram', 'facebook', 'tiktok', 'google', 'email', 'whatsapp'].find((k) => utm.includes(k) || (k === 'facebook' && utm === 'fb') || (k === 'instagram' && utm === 'ig'))
    if (known) return { src: known, camp, ref: '' }
    if (/email|newsletter|mail/.test(medium)) return { src: 'email', camp, ref: '' }
    if (/cpc|paid|ads?/.test(medium)) return { src: 'ads', camp, ref: '' }
    return { src: 'other', camp, ref: utm.slice(0, 60) }
  }
  if (p.get('fbclid')) return { src: 'facebook', camp, ref: '' }
  let host = ''
  try { host = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : '' } catch { host = '' }
  if (!host || host === window.location.hostname) return { src: 'direct', camp, ref: '' }
  const hit = SOURCE_HOSTS.find(([re]) => re.test(host))
  return hit ? { src: hit[1], camp, ref: '' } : { src: 'other', camp, ref: host.replace(/^www\./, '') }
}

function pageKind(route) {
  const path = route?.path || '/'
  const name = String(route?.name || '')
  if (path === '/' || /^\/[a-z]{2}\/?$/.test(path)) return 'home'
  if (/\/product\//.test(path)) return 'product'
  if (/\/product-category\//.test(path)) return 'category'
  if (/\/(shop|products)\/?$/.test(path)) return 'shop'
  if (/\/search/.test(path) || name === 'search') return 'search'
  if (/\/cart\/?$/.test(path)) return 'cart'
  if (/\/checkout/.test(path) && !/order-received|thank/.test(path)) return 'checkout'
  if (/\/(account|my-account)/.test(path)) return 'account'
  if (/\/blog/.test(path)) return 'blog'
  return 'page'
}

async function flush(useBeacon = false) {
  clearTimeout(timer)
  timer = null
  if (!on || !analyticsAllowed()) return
  const events = queue.splice(0, 25)
  const body = JSON.stringify({ events })
  try {
    const res = useBeacon
      ? await fetch(ENDPOINT, { method: 'POST', credentials: 'include', keepalive: true, headers: { 'Content-Type': 'application/json' }, body })
      : await fetchWithToken(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }, null, { skipNonceRetry: true })
    if (!res?.ok || useBeacon) return
    const data = await res.json().catch(() => null)
    if (data && data.on === false) { stop(); return }
    if (data) setMembership(data.audiences, data.cats)
  } catch { /* offline: those events are lost, the next batch says who this is */ }
  if (queue.length) schedule()
}

function schedule(soon = false) {
  if (timer) {
    if (!soon) return
    clearTimeout(timer)
  }
  timer = setTimeout(() => flush(), soon ? 400 : FLUSH_MS)
}

/** Adds an event (sent in the next batch). */
export function sendPersonalizationEvent(type, data = {}, soon = false) {
  if (!on || !analyticsAllowed()) return
  if (type === 'view' && Number(data.seconds) < 3) return
  queue.push({ type, ...data })
  if (queue.length >= 20) flush()
  else schedule(soon)
}

function pageEvent(route) {
  const ev = { type: 'page', path: route.path, kind: pageKind(route), dev: deviceKind(), lang: document.documentElement.lang || '' }
  let newVisit = false
  try {
    const last = Number(sessionStorage.getItem(VISIT_KEY) || 0)
    newVisit = !last || Date.now() - last > 30 * 60 * 1000
    sessionStorage.setItem(VISIT_KEY, String(Date.now()))
  } catch { newVisit = true }
  if (newVisit) Object.assign(ev, { visit: 1 }, visitSource())
  if (ev.kind === 'search') ev.q = String(route.query?.q || route.query?.s || '').slice(0, 60)
  return ev
}

/** Audience content on this page that the visitor sees (once per visit per audience). */
function noteSeen() {
  if (!on || preview) return
  let seen = {}
  try { seen = JSON.parse(sessionStorage.getItem(SEEN_KEY) || '{}') } catch { seen = {} }
  let added = false
  for (const id of audiences.value) {
    if (seen[id] || !safeId(id)) continue
    const el = document.querySelector(`.sb-au-in.sb-au-${id}`)
    if (!el || !el.offsetParent) continue
    seen[id] = 1
    added = true
    sendPersonalizationEvent('seen', { audience_id: id })
  }
  if (added) try { sessionStorage.setItem(SEEN_KEY, JSON.stringify(seen)) } catch { /* private mode */ }
}

function stop() {
  on = false
  queue = []
  clearTimeout(timer)
  setMembership([], [])
}

/* ---------------- start ---------------- */

/** From MainLayout once the page is in the browser. */
export function initPersonalization(router) {
  if (typeof window === 'undefined' || started) return
  started = true
  // The Store builder's preview: "Preview as" an audience, never events.
  if (new URLSearchParams(window.location.search).get('qwoo_editor') === '1') {
    window.addEventListener('message', (event) => {
      const d = event.data
      if (event.source !== window.parent || !d || d.source !== 'qwoo-admin' || d.type !== 'audience_preview') return
      const id = safeId(String(d.id || ''))
      if (!d.id) {
        preview = null
        document.documentElement.classList.remove('qa-au-preview')
        styleEl().textContent = ''
        return
      }
      // '__everyone__': a visitor in no audience.
      preview = id && id !== '__everyone__' ? [id] : []
      applyMembership()
    })
    return
  }
  if (!storeHasAudiences()) {
    // Nobody can be in an audience here: "in" content stays hidden, "out" content shows.
    setMembership([], [])
    return
  }
  // The last answer of this visit, at once (the store's answer replaces it).
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null')
    if (cached && Date.now() - cached.t < 30 * 60 * 1000) {
      audiences.value = cached.a || []
      cats.value = cached.c || []
      applyMembership()
    }
  } catch { /* nothing kept */ }

  const begin = () => {
    if (on) return
    on = true
    queue.push(pageEvent(router.currentRoute.value))
    flush()
  }
  if (analyticsAllowed()) begin()
  else setMembership([], [])

  router.afterEach((to, from) => {
    if (to.fullPath === from.fullPath || (to.path === from.path && to.query?.q === from.query?.q)) return
    if (!on || !analyticsAllowed()) return
    queue.push(pageEvent(to))
    schedule()
    setTimeout(noteSeen, 600)
  })
  window.addEventListener('qwoo:consent', (event) => {
    if (event.detail?.analytics) { begin(); return }
    if (!on) return
    // "No" to Analytics: the store forgets this browser.
    fetch(ENDPOINT, { method: 'POST', credentials: 'include', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events: [{ type: 'erase' }] }) }).catch(() => {})
    try { sessionStorage.removeItem(CACHE_KEY) } catch { /* private mode */ }
    stop()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && queue.length) flush(true)
  })
}
