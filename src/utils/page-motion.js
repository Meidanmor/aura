/**
 * Moving between pages (Store builder → Branding): how a new page starts
 * (scroll up smoothly, or at the top right away) and the page animation
 * (fade, fade and rise, slide, zoom) with its speed. The router asks here
 * where to scroll; after each page change the page container gets the
 * animation class (src/css/app.css, `.page-in--*`). Browser only.
 */
const SPEED = { fast: '.18s', normal: '.3s', slow: '.5s' }
const ANIMATIONS = ['fade', 'rise', 'slide', 'zoom']

const motion = { scroll: 'smooth', animation: 'none', speed: 'normal' }

/** The store's choice (the published branding; in the Store builder preview, the unsaved one). */
export function setPageMotion(brand) {
  motion.scroll = brand?.page_scroll === 'jump' ? 'jump' : 'smooth'
  motion.animation = ANIMATIONS.includes(brand?.page_animation) ? brand.page_animation : 'none'
  motion.speed = SPEED[brand?.page_speed] ? brand.page_speed : 'normal'
}

/** Where a new page starts: smoothly up, or at the top right away (always so with an animation). */
export function pageScrollTarget() {
  return motion.scroll === 'jump' || motion.animation !== 'none' ? { left: 0, top: 0 } : { left: 0, top: 0, behavior: 'smooth' }
}

/** Plays the page animation on the page container (nothing when it's "None"). */
export function animatePageIn() {
  if (typeof document === 'undefined' || motion.animation === 'none') return
  const el = document.querySelector('.q-page-container')
  if (!el) return
  const classes = ['page-in', `page-in--${motion.animation}`]
  el.classList.remove('page-in', ...ANIMATIONS.map((a) => `page-in--${a}`))
  el.style.setProperty('--page-in-dur', SPEED[motion.speed])
  // Restart when one is still running.
  void el.offsetWidth
  el.classList.add(...classes)
  const done = () => {
    el.classList.remove(...classes)
    el.removeEventListener('animationend', onEnd)
    clearTimeout(timer)
  }
  const onEnd = (e) => { if (e.target === el) done() }
  el.addEventListener('animationend', onEnd)
  // Reduced motion (no animation runs) or a missed event: never leave the class on.
  const timer = setTimeout(done, 900)
}

/** After each move to another page (not a filter or a section link on the same page). */
export function installPageMotion(router) {
  router.afterEach((to, from, failure) => {
    if (failure || !from.matched.length || to.path === from.path) return
    animatePageIn()
  })
}

/**
 * The Store builder preview shows one page, so a change of these settings (or "Play in the
 * preview") shows it there: the page starts lower down, then opens the way a new page would.
 */
export function installPageMotionPreview() {
  if (typeof window === 'undefined') return
  window.addEventListener('message', (event) => {
    const d = event.data
    if (event.source !== window.parent || !d || d.source !== 'qwoo-admin' || d.type !== 'page_motion') return
    window.scrollTo({ left: 0, top: Math.min(700, Math.max(0, document.documentElement.scrollHeight - window.innerHeight)) })
    setTimeout(() => {
      window.scrollTo(pageScrollTarget())
      animatePageIn()
    }, 450)
  })
}
