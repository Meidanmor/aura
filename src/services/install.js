import { reactive } from 'vue'
import { getPushConfig } from 'src/services/push/shared.js'

/**
 * "Add the store to your home screen" (dashboard → Notifications → Settings → Home screen).
 *
 * iPhone and iPad have no install button for sites: the shopper taps through Safari's own
 * menus. Our guide (InstallGuide.vue) can't draw over those menus or know which step the
 * shopper is on, so it shows every step at once in a card where Safari's menus don't reach,
 * with an arrow on the first button. Android / Chrome give a real install prompt
 * (beforeinstallprompt), kept here and used straight away.
 *
 * Browser only. Everything stored here is per device (localStorage, may be blocked).
 */

const DISMISS_KEY = 'qwoo_install_later'
const VISITS_KEY = 'qwoo_visits'
const SESSION_KEY = 'qwoo_visit_counted'
const GIFT_KEY = 'qwoo_install_gift_seen'
const PUSH_GIFT_KEY = 'qwoo_push_gift_seen'
const LATER_DAYS = 30
export const GUIDE_HASH = '#add-to-home'

export const install = reactive({
  guide: false, // the step card is open
  prompt: null, // Android / Chrome's install prompt, when the browser offered one
  installed: false, // this page runs from the home screen
  later: false, // the shopper closed an ask: hidden on every place for 30 days
})

const read = (key) => { try { return localStorage.getItem(key) } catch { return null } }
const write = (key, value) => { try { localStorage.setItem(key, value) } catch { /* private mode */ } }

/** The device: { os: ios | android | desktop, browser: safari | chrome | firefox | edge | inapp | other, safari: major version } */
export function device() {
  if (typeof navigator === 'undefined') return { os: 'desktop', browser: 'other', safari: 0 }
  const ua = navigator.userAgent || ''
  // iPad on iOS 13+ says it's a Mac; touch points give it away.
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  const android = /Android/.test(ua)
  let browser = 'other'
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly|Snapchat|LinkedInApp|Pinterest|GSA\//.test(ua)) browser = 'inapp'
  else if (/CriOS/.test(ua) || (android && /Chrome\//.test(ua) && !/EdgA|SamsungBrowser|OPR/.test(ua))) browser = 'chrome'
  else if (/FxiOS|Firefox/.test(ua)) browser = 'firefox'
  else if (/EdgiOS|EdgA|Edg\//.test(ua)) browser = 'edge'
  else if (ios && /Safari/.test(ua)) browser = 'safari'
  const m = ua.match(/Version\/(\d+)/)
  return { os: ios ? 'ios' : android ? 'android' : 'desktop', browser, safari: m ? Number(m[1]) : 0 }
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  } catch {
    return false
  }
}

/** Whether this device can add the store at all (phones and tablets only; asks stay off on computers). */
export function canInstall() {
  const d = device()
  if (install.installed) return false
  if (d.os === 'ios') return d.browser === 'safari' || d.browser === 'chrome' || d.browser === 'inapp' || d.browser === 'edge'
  if (d.os === 'android') return !!install.prompt || d.browser === 'chrome' || d.browser === 'inapp'
  return false
}

/** The visits on this device, counting one per browser session. */
export function visits() {
  return Number(read(VISITS_KEY)) || 0
}

export function later() {
  install.later = true
  write(DISMISS_KEY, String(Date.now() + LATER_DAYS * 864e5))
}

/** Opens the install: Android's own prompt when there is one, else our step card. */
export async function startInstall() {
  if (install.prompt) {
    const p = install.prompt
    install.prompt = null
    window.__qwooInstallPrompt = null
    try {
      await p.prompt()
      const choice = await p.userChoice
      if (choice?.outcome === 'accepted') install.installed = true
      return
    } catch { /* fall back to the guide */ }
  }
  install.guide = true
}

export function closeGuide() {
  install.guide = false
}

/** Instagram / Facebook's own browser: the page opened in Safari opens the card again by itself. */
export function markForBrowser() {
  try {
    history.replaceState(history.state, '', location.pathname + location.search + GUIDE_HASH)
  } catch { /* ignore */ }
}

/** The owner's settings: { on, thanks, repeat, account, gift, push_gift }. */
export async function installSettings() {
  const cfg = await getPushConfig()
  return cfg.install || { on: false }
}

/** Whether an ask may show at this place now (thanks | repeat | account). */
export async function mayAsk(place) {
  if (install.later || !canInstall()) return false
  const s = await installSettings()
  if (!s.on || !s[place]) return false
  return place !== 'repeat' || visits() >= 2
}

export const giftSeen = {
  install: () => read(GIFT_KEY) === '1',
  push: () => read(PUSH_GIFT_KEY) === '1',
  markInstall: () => write(GIFT_KEY, '1'),
  markPush: () => write(PUSH_GIFT_KEY, '1'),
}

let started = false
/** Once, from MainLayout's first paint: visit count, the install prompt, the "open in Safari" mark. */
export function initInstall() {
  if (started || typeof window === 'undefined') return
  started = true
  install.installed = isStandalone()
  install.later = Number(read(DISMISS_KEY)) > Date.now()
  try {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, '1')
      write(VISITS_KEY, String(visits() + 1))
    }
  } catch { /* ignore */ }
  // Chrome offers its install window early, often before the app starts: a tiny script in the
  // page head (render.js) keeps it in window.__qwooInstallPrompt. Later offers come here.
  if (window.__qwooInstallPrompt) install.prompt = window.__qwooInstallPrompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    install.prompt = e
    window.__qwooInstallPrompt = e
  })
  window.addEventListener('appinstalled', () => {
    install.installed = true
    install.guide = false
  })
  // Came back from Instagram / Facebook's browser with the mark: open the card here.
  if (location.hash === GUIDE_HASH) {
    try { history.replaceState(history.state, '', location.pathname + location.search) } catch { /* ignore */ }
    const d = device()
    if (d.os === 'ios' && d.browser !== 'inapp' && !install.installed) install.guide = true
  }
}
