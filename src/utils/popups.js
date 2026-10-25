// Popups (Store builder → Popups), published in /config/popups.json:
// { popups: [ { id, name, settings, sections } ] }. The rules here decide
// which popup may open by itself on a page (PopupHost.vue arms its trigger).
// Links open one with "#popup:{id}" (openPopup()).

import { chromeMatch } from 'src/utils/layouts.js'

export const POPUP_LINK = /#popup:(pp_[A-Za-z0-9]{3,20})/

/** Opens a popup from anywhere (PopupHost listens). */
export function openPopup(id) {
  if (typeof window === 'undefined' || !id) return
  window.dispatchEvent(new CustomEvent('qwoo:popup', { detail: { id } }))
}

/** The popup id a link opens, or ''. */
export function popupIdOf(url) {
  const m = POPUP_LINK.exec(String(url || ''))
  return m ? m[1] : ''
}

export const AUTO_TRIGGERS = ['load', 'delay', 'scroll', 'exit', 'pages']

const LOCAL_KEY = 'qwoo-popups'
const SESSION_KEY = 'qwoo-popups-visit'
const VIEWS_KEY = 'qwoo-popup-views'

function read(storage, key) {
  try {
    const v = JSON.parse(storage.getItem(key) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}
function write(storage, key, value) {
  try { storage.setItem(key, JSON.stringify(value)) } catch { /* private mode: every time */ }
}

/** Remembers that a popup was shown (for "How often"). */
export function markShown(id) {
  if (typeof window === 'undefined') return
  const all = read(localStorage, LOCAL_KEY)
  all[id] = Date.now()
  write(localStorage, LOCAL_KEY, all)
  const visit = read(sessionStorage, SESSION_KEY)
  visit[id] = 1
  write(sessionStorage, SESSION_KEY, visit)
}

/** Pages seen in this visit (counted once per page change). */
export function countView() {
  if (typeof window === 'undefined') return 0
  let n = 0
  try { n = (parseInt(sessionStorage.getItem(VIEWS_KEY) || '0', 10) || 0) + 1; sessionStorage.setItem(VIEWS_KEY, String(n)) } catch { n = 1 }
  return n
}

/** The screen size the visitor has now. */
export function deviceNow() {
  const w = window.innerWidth
  return w >= 1024 ? 'desktop' : w >= 768 ? 'tablet' : 'mobile'
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Whether a popup may open by itself here and now: its dates, who (signed in
 * or not, screen size), where (pages, and the pages it never shows on) and
 * how often. ctx: { where (chromeTarget), signedIn, views }.
 */
export function mayOpenBySelf(popup, ctx) {
  const s = popup?.settings || {}
  if (!AUTO_TRIGGERS.includes(s.trigger)) return false
  const day = today()
  if (s.start_date && day < s.start_date) return false
  if (s.end_date && day > s.end_date) return false
  if (s.audience === 'guests' && ctx.signedIn) return false
  if (s.audience === 'customers' && !ctx.signedIn) return false
  if (s.hide_on?.[deviceNow()]) return false
  if (s.where === 'chosen' && !chromeMatch({ targets: s.targets, page_paths: s.page_paths }, ctx.where)) return false
  if ((s.exclude || []).length && chromeMatch({ targets: s.exclude, page_paths: s.exclude_paths }, ctx.where)) return false
  if (s.trigger === 'pages' && ctx.views < (Number(s.pages) || 3)) return false
  if (s.trigger === 'exit' && !window.matchMedia?.('(pointer: fine)').matches) return false
  const last = read(localStorage, LOCAL_KEY)[popup.id]
  switch (s.frequency) {
    case 'always': return true
    case 'once': return !last
    case 'days': return !last || Date.now() - last > (Number(s.days) || 7) * 864e5
    default: return !read(sessionStorage, SESSION_KEY)[popup.id] // once per visit
  }
}
