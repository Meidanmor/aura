// Tracking & custom code in the browser (see src-ssr/custom-code.js for the
// server's part). window.__QWOO_CODE__ holds the snippets this browser may run;
// the server already wrote in those the shopper had allowed for the first page
// (`ran`). Here:
//   - the shopper's consent choice (ConsentBanner.vue saves it): newly allowed
//     snippets run at once;
//   - pages change without reloading: snippets meant for a page run when it's
//     first opened (code never "un-runs" when leaving a page);
//   - the shop's events (track()): page_view, view_item, add_to_cart,
//     begin_checkout, purchase, to the dataLayer (Tag Manager), the GA4 and
//     Meta shortcuts, window events "qwoo:{name}" and qwoo.on(name, fn);
//   - what the page's security rules blocked is reported to the store
//     (Settings → Tracking & code lists it; in the test browser it's added).

import { CONSENT_COOKIE, allowedGroups, formatConsent, onPage, parseConsent } from 'src/utils/custom-code-rules.js'
import { chromeTarget } from 'src/utils/layouts.js'

let cfg = null
let choice = null
let currentRoute = null
const ran = new Set()
const events = []
const handlers = []

/** The store's custom code for this browser, or null (none set up). */
export const codeConfig = () => cfg

function readCookie(name) {
  for (const part of document.cookie.split(';')) {
    const at = part.indexOf('=')
    if (at > 0 && part.slice(0, at).trim() === name) return decodeURIComponent(part.slice(at + 1).trim())
  }
  return ''
}

/** The shopper's saved choice, or null. */
export const consentChoice = () => choice

/** The groups that may run now. */
export const allowedNow = () => allowedGroups(cfg?.mode, choice)

/** Saves the shopper's choice (for 6 months) and runs what it allows. */
export function saveConsent(next) {
  choice = { analytics: !!next.analytics, marketing: !!next.marketing }
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${formatConsent(choice)}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax${secure}`
  const a = allowedNow()
  if (typeof window.gtag === 'function') {
    const g = (yes) => (yes ? 'granted' : 'denied')
    window.gtag('consent', 'update', { analytics_storage: g(a.analytics), ad_storage: g(a.marketing), ad_user_data: g(a.marketing), ad_personalization: g(a.marketing) })
  }
  if (typeof window.fbq === 'function') window.fbq('consent', a.marketing ? 'grant' : 'revoke')
  window.dispatchEvent(new CustomEvent('qwoo:consent', { detail: a }))
  // Trackers that start now still count this page.
  if (runAllowed()) vendorPageView()
}

/** Opens the consent banner's choices (the footer's "Cookie settings", any "#cookie-settings" link). */
export const openConsent = () => window.dispatchEvent(new CustomEvent('qwoo:consent-open'))

/* ---------------- running snippets ---------------- */

const pageNonce = () => {
  const s = document.querySelector('script[nonce]')
  return s ? s.nonce || s.getAttribute('nonce') || '' : ''
}

/**
 * Puts a snippet's code on the page, in order: a script with its own file is
 * loaded before the next part runs (as it would in the page's own HTML).
 */
async function inject(snippet) {
  const nonce = pageNonce()
  const frag = document.createRange().createContextualFragment(snippet.code)
  const nodes = [...frag.childNodes]
  let anchor = snippet.place === 'body_start' ? document.body.firstChild : null
  const parent = snippet.place === 'head' ? document.head : document.body
  parent.insertBefore(document.createComment(` ${String(snippet.name || snippet.id).replace(/--/g, '')} `), anchor)
  for (const node of nodes) {
    let el = node
    let wait = null
    if (node.nodeName === 'SCRIPT') {
      el = document.createElement('script')
      for (const attr of node.attributes) if (attr.name !== 'nonce') el.setAttribute(attr.name, attr.value)
      el.nonce = nonce
      el.text = node.text
      if (node.src && !node.hasAttribute('async') && !node.hasAttribute('defer')) {
        el.async = false
        wait = new Promise((resolve) => { el.onload = el.onerror = resolve })
      }
    }
    // Scripts inside other elements (rare) get the nonce too.
    if (el.querySelectorAll) {
      for (const inner of el.querySelectorAll('script')) {
        const s = document.createElement('script')
        for (const attr of inner.attributes) if (attr.name !== 'nonce') s.setAttribute(attr.name, attr.value)
        s.nonce = nonce
        s.text = inner.text
        inner.replaceWith(s)
      }
    }
    parent.insertBefore(el, anchor)
    if (wait) await Promise.race([wait, new Promise((resolve) => setTimeout(resolve, 8000))])
  }
}

/** Runs every allowed snippet for this page that hasn't run yet; whether any did. */
function runAllowed() {
  if (!cfg) return false
  const groups = allowedNow()
  const where = chromeTarget(currentRoute)
  let any = false
  for (const s of cfg.snippets) {
    if (ran.has(s.id) || !groups[s.group] || !onPage(s, where)) continue
    ran.add(s.id)
    any = true
    inject(s).catch((err) => console.warn('[custom code]', s.name, err))
  }
  return any
}

/* ---------------- events ---------------- */

const META = { page_view: 'PageView', view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'Purchase' }

function pageInfo() {
  return { page_path: location.pathname + location.search, page_location: location.href, page_title: document.title }
}

/** The GA4 and Meta shortcuts (Tag Manager reads the dataLayer itself). */
function toVendors(name, data) {
  const s = cfg?.shortcuts || {}
  const a = allowedNow()
  const e = data.ecommerce
  if (s.ga4 && a.analytics && typeof window.gtag === 'function') {
    window.gtag('event', name, { ...(e || {}), ...(name === 'page_view' ? { page_location: data.page_location, page_title: data.page_title } : {}), send_to: s.ga4 })
  }
  if (s.meta && a.marketing && typeof window.fbq === 'function' && META[name]) {
    if (!e) return window.fbq('track', META[name])
    const params = {
      content_ids: e.items.map((i) => i.item_id),
      content_type: 'product',
      contents: e.items.map((i) => ({ id: i.item_id, quantity: i.quantity })),
      value: e.value,
      currency: e.currency,
      num_items: e.items.reduce((n, i) => n + (i.quantity || 1), 0),
    }
    // The order's id: a later server-side copy of the same purchase won't count twice.
    window.fbq('track', META[name], params, e.transaction_id ? { eventID: `order_${e.transaction_id}` } : undefined)
  }
}

function vendorPageView() {
  toVendors('page_view', pageInfo())
}

/**
 * A shop event: { ecommerce: { currency, value, items: [{ item_id, item_name,
 * price, quantity, item_category? }], transaction_id? } } (GA4's shape), or
 * the page for page_view.
 */
export function track(name, data = {}) {
  if (typeof window === 'undefined') return
  const entry = { event: name, ...data }
  events.push(entry)
  if (events.length > 100) events.shift()
  // Only kept on the page: a tracker that reads it is one the shopper allowed.
  window.dataLayer = window.dataLayer || []
  if (data.ecommerce) window.dataLayer.push({ ecommerce: null })
  window.dataLayer.push(entry)
  if (cfg) toVendors(name, data)
  for (const [n, fn] of handlers) if (n === name || n === '*') safe(fn, entry)
  window.dispatchEvent(new CustomEvent(`qwoo:${name}`, { detail: entry }))
}

const safe = (fn, entry) => {
  try { fn(entry) } catch (err) { console.warn('[custom code] qwoo.on', err) }
}

const plain = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#0?39;|&#8217;/g, "'").replace(/&quot;/g, '"').trim()

/** A Store API product, cart item or order item as an event item. */
export function eventItem(p, quantity = 1, minorUnit = null) {
  const prices = p?.prices || {}
  const unit = minorUnit ?? Number(prices.currency_minor_unit ?? 2)
  const price = Number(prices.price ?? prices.sale_price ?? 0) / 10 ** unit
  const variant = (p?.variation || []).map((v) => plain(v.value)).filter(Boolean).join(' / ')
  return {
    // Order items carry the product's id apart (their own id is the order line's).
    item_id: String(p?.variation_id || p?.product_id || p?.id || ''),
    item_name: plain(p?.name),
    price: Number.isFinite(price) ? Math.round(price * 100) / 100 : 0,
    quantity: Number(p?.quantity) || quantity || 1,
    ...(variant ? { item_variant: variant } : {}),
    ...(p?.categories?.[0]?.name ? { item_category: plain(p.categories[0].name) } : {}),
  }
}

/** { currency, value, items } from items with prices. */
export function ecommerceOf(items, currency, value) {
  const list = items.filter((i) => i.item_id)
  const sum = list.reduce((n, i) => n + i.price * (i.quantity || 1), 0)
  return { currency: currency || '', value: Math.round((value ?? sum) * 100) / 100, items: list }
}

/** A purchase is counted once per order on this browser (a reload of the thank-you page doesn't count again). */
export function trackPurchaseOnce(orderId, ecommerce) {
  const key = 'qwoo-tracked-orders'
  let done = []
  try { done = JSON.parse(localStorage.getItem(key) || '[]') } catch { done = [] }
  if (!Array.isArray(done)) done = []
  if (done.includes(String(orderId))) return
  track('purchase', { ecommerce: { ...ecommerce, transaction_id: String(orderId) } })
  try { localStorage.setItem(key, JSON.stringify([...done, String(orderId)].slice(-20))) } catch { /* private mode */ }
}

/* ---------------- blocked addresses ---------------- */

const KIND_OF = [['script', 'script'], ['connect', 'connect'], ['frame', 'frame'], ['child', 'frame'], ['style', 'style'], ['font', 'font'], ['media', 'media']]
const EXTENSION_RE = /^(chrome|moz|safari-web|ms-browser)-extension:/

function watchBlocked(early) {
  const seenKey = 'qwoo-code-reported'
  let seen = {}
  try { seen = JSON.parse(sessionStorage.getItem(seenKey) || '{}') || {} } catch { seen = {} }
  let queue = []
  let timer = 0
  const send = () => {
    timer = 0
    if (!queue.length) return
    const reports = queue.splice(0, 20)
    fetch('/wp-json/qwoo/v1/code-report', { method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reports }) }).catch(() => {})
  }
  const onBlocked = (e) => {
    // A browser extension's own scripts: not the store's business.
    if (EXTENSION_RE.test(e.sourceFile || '') || EXTENSION_RE.test(e.blockedURI || '')) return
    const dir = String(e.effectiveDirective || e.violatedDirective || '')
    let kind = e.blockedURI === 'eval' ? 'eval' : (KIND_OF.find(([p]) => dir.startsWith(p)) || [])[1]
    if (!kind) return
    let host = 'eval'
    if (kind !== 'eval') {
      try {
        const url = new URL(e.blockedURI)
        if (!/^(https?|wss?):$/.test(url.protocol) || url.host === location.host) return
        host = url.hostname
      } catch {
        return
      }
    }
    let via = ''
    try { via = e.sourceFile ? new URL(e.sourceFile).hostname : '' } catch { via = '' }
    const id = `${kind}|${host}`
    if (seen[id] || Object.keys(seen).length > 60) return
    seen[id] = 1
    try { sessionStorage.setItem(seenKey, JSON.stringify(seen)) } catch { /* private mode */ }
    queue.push({ host, kind, via })
    if (!timer) timer = setTimeout(send, 3000)
  }
  // Blocked while the page loaded (the head script kept them), then from now on.
  for (const e of early) onBlocked(e)
  document.addEventListener('securitypolicyviolation', onBlocked)
  window.addEventListener('pagehide', send)
}

/* ---------------- the test browser ---------------- */

function testBadge() {
  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  el.style.cssText = 'position:fixed;inset-inline-start:12px;bottom:12px;z-index:99999;display:flex;gap:10px;align-items:center;padding:8px 12px;border-radius:999px;background:#1f1d2b;color:#fff;font:600 13px/1.2 system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25)'
  const label = document.createElement('span')
  label.textContent = document.documentElement.lang === 'he' ? 'בדיקת קוד מותאם' : 'Testing custom code'
  const stop = document.createElement('a')
  stop.href = '/?qwoo_code_test=off'
  stop.textContent = document.documentElement.lang === 'he' ? 'יציאה' : 'Stop'
  stop.style.cssText = 'color:#c9c3ff;text-decoration:underline'
  el.append(label, stop)
  document.body.appendChild(el)
}

/* ---------------- start ---------------- */

/** From MainLayout, once the page is in the browser. */
export function initCustomCode(router) {
  if (typeof window === 'undefined' || cfg) return
  const state = window.__QWOO_CODE__
  if (!state || !Array.isArray(state.snippets)) return
  cfg = state
  choice = parseConsent(readCookie(CONSENT_COOKIE))
  for (const id of state.ran || []) ran.add(id)
  currentRoute = router.currentRoute.value

  // Snippets in the head may have queued qwoo.on() calls already.
  const early = Array.isArray(window.qwoo?.q) ? window.qwoo.q : []
  const earlyBlocked = Array.isArray(window.qwoo?.v) ? window.qwoo.v : []
  window.qwoo = {
    events,
    on(name, fn) {
      if (typeof fn !== 'function') return
      handlers.push([name, fn])
      // What already happened on this page (a tracker that started late still sees it).
      for (const e of events) if (e.event === name || name === '*') safe(fn, e)
    },
    consent: () => ({ ...allowedNow() }),
    openConsent,
  }
  for (const [name, fn] of early) window.qwoo.on(name, fn)

  // "#cookie-settings" links (a footer link the owner adds) open the choices.
  document.addEventListener('click', (e) => {
    const a = e.target?.closest?.('a[href$="#cookie-settings"]')
    if (!a) return
    e.preventDefault()
    openConsent()
  }, true)

  if (state.snippets.length) watchBlocked(earlyBlocked)
  if (state.testing) testBadge()

  runAllowed()
  // Pages' own events can come first (a page mounts before its layout): the trackers get them after the page view.
  const before = [...events]
  track('page_view', pageInfo())
  for (const e of before) toVendors(e.event, e)
  router.afterEach((to, from) => {
    if (to.fullPath === from.fullPath) return
    currentRoute = to
    // After the new page's title is set.
    setTimeout(() => {
      runAllowed()
      track('page_view', pageInfo())
    }, 120)
  })
}
