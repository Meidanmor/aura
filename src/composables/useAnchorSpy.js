/**
 * Menu links to a section of a page ("/#contact"). The router counts them as the current
 * page whatever the hash, so every anchor link and the page's own link all looked active.
 * Here a link to a section is active only after it was clicked, or while its section is on
 * the screen; the page's own link ("/") is active only while no such section is.
 */
import { reactive } from 'vue'
import { useRouter } from 'vue-router'

const state = reactive({ hash: '' })
// Hashes the menus link to (the sections to watch while scrolling).
const watched = new Set()
let started = false
let quietUntil = 0

const hashOf = (url) => {
  const s = String(url || '')
  const at = s.indexOf('#')
  return at < 0 ? '' : s.slice(at)
}

/** The section a hash points to, or null. */
export function anchorTarget(hash) {
  if (typeof document === 'undefined' || !hash || hash === '#') return null
  let id = hash.slice(1)
  try { id = decodeURIComponent(id) } catch { /* keep it as it is */ }
  return document.getElementById(id)
}

/** How far below the top of the screen content starts (a header that stays on screen). */
export function headerOffset() {
  if (typeof document === 'undefined') return 0
  return (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--qwoo-header-stuck')) || 0) + 8
}

function scrollToHash(hash, smooth = true) {
  const el = anchorTarget(hash)
  if (!el) return false
  const top = el.getBoundingClientRect().top + window.scrollY - headerOffset()
  window.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' })
  return true
}

/** The watched section under the line a third of the way down the screen, or ''. */
function sectionOnScreen() {
  const line = headerOffset() + window.innerHeight * 0.3
  let found = ''
  for (const hash of watched) {
    const el = anchorTarget(hash)
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (r.top <= line && r.bottom > line) found = hash
  }
  return found
}

function start(router) {
  started = true
  const route = router.currentRoute.value
  let path = route.path
  const follow = (route) => {
    if (route.path !== path) {
      path = route.path
      state.hash = route.hash || ''
    } else if (route.hash) {
      state.hash = route.hash
    }
    // While a click scrolls the page, the sections it passes don't count.
    if (route.hash) quietUntil = Date.now() + 1200
  }
  router.afterEach((to) => follow(to))
  follow(route)

  let frame = 0
  const onScroll = () => {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      if (Date.now() < quietUntil || !watched.size) return
      const now = sectionOnScreen()
      if (now !== state.hash) state.hash = now
    })
  }
  addEventListener('scroll', onScroll, { passive: true })

  // Clicking the link of the section the address already points to: the router sees no change, so scroll here.
  document.addEventListener('click', (e) => {
    const a = e.target?.closest?.('a[href*="#"]')
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return
    const url = new URL(a.href, location.href)
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.hash !== location.hash) return
    if (scrollToHash(url.hash)) {
      e.preventDefault()
      state.hash = url.hash
      quietUntil = Date.now() + 1200
    }
  })
}

export function useAnchorSpy() {
  const router = useRouter()
  if (process.env.CLIENT && !started) start(router)
  return {
    /**
     * The router-link's exact-active class for a menu link: given to links the router
     * already counts as this page, so only the hash decides.
     */
    activeClass(url, cls = 'router-link-exact-active') {
      const hash = hashOf(url)
      if (hash && hash !== '#') {
        watched.add(hash)
        return state.hash === hash ? cls : 'anchor-idle'
      }
      return state.hash ? 'anchor-idle' : cls
    },
  }
}

/** For the router's scrollBehavior: the section of a hash, waiting a moment for a new page to draw it. */
export function scrollPositionFor(hash) {
  return new Promise((resolve) => {
    let tries = 0
    const look = () => {
      const el = anchorTarget(hash)
      if (el) return resolve({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - headerOffset()), behavior: 'smooth' })
      if (++tries > 40) return resolve({ left: 0, top: 0 })
      setTimeout(look, 50)
    }
    setTimeout(look, 10)
  })
}
