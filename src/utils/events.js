/**
 * The owner's own events (dashboard: Analytics → Events).
 *
 * The store sends the list with the tracking settings (window.__QWOO_CODE__.events):
 * each event has what starts it, how it is counted (once per visit, or every time),
 * a value, and the tools it goes to. Here, in the browser only:
 *   - a click on a section or block the owner picked in the Store builder
 *     (class sb-ev-{id}; a Form block counts when it is sent, not when clicked);
 *   - a click on a kind of link (phone, WhatsApp, email, a link that leaves the store,
 *     a file, or an address that contains a text);
 *   - a page that was opened, a form that was sent, scrolling down, staying on a page.
 * One listener per kind, added only when an event needs it; scroll listeners are passive.
 *
 * Nothing here is code the owner typed: a start is a choice from a fixed list, texts
 * are compared as plain text, and what an event carries is fixed (the page's path and
 * the value): never what a shopper wrote, searched or is.
 *
 * Sending: trackOwn() (custom-code.js) gives the event to the tools the owner chose,
 * each only if the shopper accepted its kind of cookie; the store's own count goes
 * through Audiences (personalization.js: only with Analytics cookies).
 * Never in the Store builder's preview.
 */
import { ownEvents, trackOwn } from 'src/utils/custom-code.js'
import { sendPersonalizationEvent } from 'src/utils/personalization.js'

const ID_RE = /^ev_[a-z0-9]{8,12}$/
const DONE_KEY = 'qwoo_ev_done'
const FILE_RE = /\.(pdf|zip|rar|7z|docx?|xlsx?|pptx?|csv|txt|epub|mp3|mp4)$/i
const WHATSAPP_RE = /^(https?:\/\/(wa\.me|(api|web|chat)\.whatsapp\.com)\/|whatsapp:)/i

let started = false
let list = []
let done = new Set()
const lastFired = new Map()

function fire(ev) {
  const now = Date.now()
  if (ev.every) {
    // A double click is one click.
    if (now - (lastFired.get(ev.id) || 0) < 1000) return
  } else {
    if (done.has(ev.id)) return
    done.add(ev.id)
    try { sessionStorage.setItem(DONE_KEY, JSON.stringify([...done].slice(-60))) } catch { /* private mode */ }
  }
  lastFired.set(ev.id, now)
  trackOwn(ev)
  sendPersonalizationEvent('ev', { id: ev.id, path: window.location.pathname })
}

const lower = (s) => String(s || '').toLowerCase()
const cleanPath = (p) => {
  let path = String(p || '/')
  try { path = decodeURI(path) } catch { /* keep as it is */ }
  return '/' + path.toLowerCase().replace(/^\/+|\/+$/g, '')
}

/* ---------------- pages ---------------- */

function pageIs(kind, text, path) {
  switch (kind) {
    case 'home': return path === '/' || /^\/[a-z]{2}$/.test(path)
    case 'product': return /\/product\//.test(path + '/')
    case 'category': return /\/product-category\//.test(path + '/')
    case 'shop': return /\/(shop|products)$/.test(path)
    case 'cart': return /\/cart$/.test(path)
    case 'thanks': return /order-received|thank/.test(path)
    case 'checkout': return /\/checkout/.test(path) && !/order-received|thank/.test(path)
    case 'search': return /\/search/.test(path)
    case 'blog': return /\/blog/.test(path)
    case 'account': return /\/(account|my-account)/.test(path)
    case 'path': return path === cleanPath(text)
    case 'contains': return !!text && path.includes(lower(text))
  }
  return false
}

/** Scroll and time events: on every page, or pages whose address contains a text. */
const onThisPage = (start, path) => start.on !== 'contains' || (!!start.on_text && path.includes(lower(start.on_text)))

/* ---------------- one page's scroll and time events ---------------- */

let scrollWaiting = []
let timers = []
let scrollTimer = 0

function checkScroll() {
  scrollTimer = 0
  if (!scrollWaiting.length) return
  const doc = document.documentElement
  const height = Math.max(doc.scrollHeight, document.body?.scrollHeight || 0)
  if (height <= 0) return
  const seen = ((window.scrollY + window.innerHeight) / height) * 100
  scrollWaiting = scrollWaiting.filter((ev) => {
    if (seen < ev.start.percent) return true
    fire(ev)
    return false
  })
}

function onScroll() {
  if (!scrollTimer && scrollWaiting.length) scrollTimer = setTimeout(checkScroll, 200)
}

function enterPage() {
  const path = cleanPath(window.location.pathname)
  for (const t of timers) clearTimeout(t)
  timers = []
  scrollWaiting = []
  for (const ev of list) {
    const s = ev.start
    if (s.type === 'page' && pageIs(s.kind, s.text, path)) fire(ev)
    else if (s.type === 'scroll' && onThisPage(s, path)) scrollWaiting.push(ev)
    else if (s.type === 'time' && onThisPage(s, path)) {
      // Only a shopper who is still looking at the page.
      timers.push(setTimeout(() => { if (document.visibilityState === 'visible') fire(ev) }, s.seconds * 1000))
    }
  }
}

/* ---------------- clicks ---------------- */

function linkIs(a, start) {
  const href = a.getAttribute('href') || ''
  switch (start.kind) {
    case 'phone': return /^tel:/i.test(href)
    case 'email': return /^mailto:/i.test(href)
    case 'whatsapp': return WHATSAPP_RE.test(a.href || href)
    case 'outside': return /^https?:$/.test(a.protocol) && !!a.host && a.host !== window.location.host && !WHATSAPP_RE.test(a.href)
    case 'download': return a.hasAttribute('download') || FILE_RE.test(a.pathname || '')
    case 'contains': return !!start.text && lower(a.href || href).includes(lower(start.text))
  }
  return false
}

/** The events of the marked sections and blocks around an element (innermost first). */
function markedAround(el, withForms) {
  const out = []
  let node = el?.closest?.('[class*="sb-ev-"]')
  while (node) {
    for (const c of node.classList) {
      if (!c.startsWith('sb-ev-')) continue
      const ev = blockEvents.get(c.slice(6))
      // A marked form (or a section around one) counts when the form is sent.
      if (ev && (withForms || !node.querySelector('.form-block'))) out.push(ev)
    }
    node = node.parentElement?.closest?.('[class*="sb-ev-"]')
  }
  return out
}

let blockEvents = new Map()

function onClick(e) {
  const target = e.target
  if (!(target instanceof Element)) return
  if (blockEvents.size) for (const ev of markedAround(target, false)) fire(ev)
  if (!linkEvents.length) return
  const a = target.closest('a[href]')
  if (a) for (const ev of linkEvents) if (linkIs(a, ev.start)) fire(ev)
}

let linkEvents = []

/* ---------------- start ---------------- */

/** From MainLayout, once the page is in the browser (after the tracking code started). */
export function initEvents(router) {
  if (typeof window === 'undefined' || started) return
  started = true
  if (new URLSearchParams(window.location.search).get('qwoo_editor') === '1') return
  list = ownEvents().filter((e) => e && ID_RE.test(e.id) && e.start && typeof e.start === 'object')
  if (!list.length) return
  try {
    const kept = JSON.parse(sessionStorage.getItem(DONE_KEY) || '[]')
    if (Array.isArray(kept)) done = new Set(kept.filter((id) => ID_RE.test(id)))
  } catch { done = new Set() }

  blockEvents = new Map(list.filter((e) => e.start.type === 'block').map((e) => [e.id, e]))
  linkEvents = list.filter((e) => e.start.type === 'link')
  const formEvents = list.filter((e) => e.start.type === 'form')

  if (blockEvents.size || linkEvents.length) document.addEventListener('click', onClick, { capture: true, passive: true })
  if (blockEvents.size || formEvents.length) {
    // FormBlock.vue says when a form was sent (never what was written in it).
    window.addEventListener('qwoo:form_sent', (e) => {
      for (const ev of formEvents) fire(ev)
      for (const ev of markedAround(e.detail?.el, true)) fire(ev)
    })
  }
  if (list.some((e) => e.start.type === 'scroll')) window.addEventListener('scroll', onScroll, { passive: true })

  if (list.some((e) => ['page', 'scroll', 'time'].includes(e.start.type))) {
    enterPage()
    router.afterEach((to, from) => {
      if (to.path === from.path) return
      // After the new page is in place.
      setTimeout(enterPage, 150)
    })
  }
}
