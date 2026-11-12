/**
 * Moving between pages (Store builder → Branding): how a new page starts
 * (scroll up smoothly, or at the top right away) and the page animation
 * (fade, fade and rise, slide, zoom) with its speed.
 *
 * An animation has two halves, played one after the other:
 *   1. the page being left goes away (data-page-move="out"), once the next page is ready to show;
 *   2. nothing is on screen: the pages swap and the window scrolls (to the top, to a
 *      section, or back to where a Back / Forward page was);
 *   3. the new page arrives (data-page-move="in").
 * So the scroll is never seen and never fights the animation. The layout's <main> and the
 * footer are marked (and the header when it has scrolled out of view, so it doesn't pop in)
 * with data-page-move="out" | "in" and data-page-anim: attributes, not classes, because Vue
 * rewrites an element's classes when the page changes. CSS: the end of src/css/app.css.
 * Browser only.
 */
import { nextTick } from 'vue'
import { isNavigationFailure, NavigationFailureType } from 'vue-router'

const SPEED = { fast: 180, normal: 300, slow: 500 }
const ANIMATIONS = ['fade', 'rise', 'slide', 'zoom']
const OUT_PART = 0.7 // the leaving half is a little shorter than the arriving one

const motion = { scroll: 'smooth', animation: 'none', speed: 'normal' }

/** The store's choice (the published branding; in the Store builder preview, the unsaved one). */
export function setPageMotion(brand) {
  motion.scroll = brand?.page_scroll === 'jump' ? 'jump' : 'smooth'
  motion.animation = ANIMATIONS.includes(brand?.page_animation) ? brand.page_animation : 'none'
  motion.speed = SPEED[brand?.page_speed] ? brand.page_speed : 'normal'
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const animated = () => typeof document !== 'undefined' && motion.animation !== 'none' && !reducedMotion()

/** Where a new page starts: smoothly up, or at the top right away (always so with an animation). */
export function pageScrollTarget() {
  return motion.scroll === 'jump' || motion.animation !== 'none' ? { left: 0, top: 0 } : { left: 0, top: 0, behavior: 'smooth' }
}

// What moves: the layout's <main> and the footer; the header parts only when they are out of view
// (a header that stays on screen stays put). Never .q-page-container, .q-layout or #q-app: the
// storefront turns animations off there (animation: none !important), so a class there never plays.
function movers() {
  const list = []
  const main = document.querySelector('.q-page-container > main')
  if (main) list.push(main)
  const footer = document.querySelector('.q-layout > footer')
  if (footer) list.push(footer)
  for (const el of document.querySelectorAll('.q-layout > .q-header, .q-layout > .above-header, .q-layout > .announcement-bar')) {
    if (el.getBoundingClientRect().bottom <= 0) list.push(el)
  }
  return list
}

const clear = (el) => {
  el.removeAttribute('data-page-move')
  el.removeAttribute('data-page-anim')
  el.style.removeProperty('--page-move-dur')
}
const mark = (el, half, animation, ms) => {
  el.style.setProperty('--page-move-dur', `${ms}ms`)
  el.setAttribute('data-page-anim', animation)
  el.setAttribute('data-page-move', half)
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// The move in progress: { els, out (ends with the leaving half), gap (resolves when the pages have
// swapped, hidden), open() }.
let run = null
let inTimer = 0
let stuckTimer = 0

/** First half: the page on screen goes away. Starts once per move. */
function leave() {
  if (run) return run
  clearTimeout(inTimer)
  const els = movers()
  const ms = Math.round(SPEED[motion.speed] * OUT_PART)
  for (const el of els) {
    clear(el)
    mark(el, 'out', motion.animation, ms)
  }
  let open
  const gap = new Promise((resolve) => { open = resolve })
  run = { els, out: wait(ms), gap, open, animation: motion.animation }
  // A move that never ends (a page that fails to load) must not leave the screen empty.
  clearTimeout(stuckTimer)
  stuckTimer = setTimeout(restore, 8000)
  return run
}

/** Back to a plain page (a move that was stopped). */
function restore() {
  clearTimeout(stuckTimer)
  if (!run) return
  run.els.forEach(clear)
  run.open()
  run = null
}

/** Second half: the pages have swapped. The scroll goes first (still hidden), then the new page arrives. */
function arrive() {
  clearTimeout(stuckTimer)
  const current = run
  if (!current) return
  run = null
  current.open()
  // One beat for the router's scroll (it waits for `gap`), then the page comes in.
  inTimer = setTimeout(() => {
    const ms = SPEED[motion.speed]
    for (const el of current.els) {
      clear(el)
      // A new element starts its animation; the same one needs a beat to start over.
      void el.offsetWidth
      if (el.isConnected) mark(el, 'in', current.animation, ms)
    }
    inTimer = setTimeout(() => current.els.forEach(clear), ms + 60)
  }, 20)
}

/**
 * For the router's scrollBehavior: resolves when the window may scroll. Right away with no
 * animation; with one, once the old page is gone and the new one is in place (still hidden).
 */
export function pageGap() {
  return run ? run.gap : Promise.resolve()
}

/** True while a page animation owns the move (the router then scrolls without its own delay). */
export function pageMoving() {
  return !!run
}

/** Every move to another page (not a filter or a section link on the same page). */
export function installPageMotion(router) {
  const moves = (to, from) => from.matched.length > 0 && to.path !== from.path
  // The leaving half starts once the next page's code is loaded (so the screen is never left
  // empty while it loads), and the pages only swap when it has finished.
  router.beforeResolve(async (to, from) => {
    if (moves(to, from) && animated()) await leave().out
  })
  router.afterEach((to, from, failure) => {
    if (!run) return
    // Stopped because a newer move started: that one finishes the animation.
    if (failure && isNavigationFailure(failure, NavigationFailureType.cancelled)) return
    if (failure || !moves(to, from)) { restore(); return }
    nextTick(arrive)
  })
  router.onError(restore)
}

/**
 * The Store builder preview shows one page, so a change of these settings (or "Play in the
 * preview") plays them there as the message gives them (not yet published), the same way a
 * shopper sees a move: the page goes away, the window goes to the top, the page arrives. With
 * no animation: a page scrolled down goes back up the chosen way (smoothly, or right away).
 */
export function installPageMotionPreview() {
  if (typeof window === 'undefined') return
  let turn = 0
  window.addEventListener('message', async (event) => {
    const d = event.data
    if (event.source !== window.parent || !d || d.source !== 'qwoo-admin' || d.type !== 'page_motion') return
    if (d.animation !== undefined) setPageMotion({ page_scroll: d.scroll, page_animation: d.animation, page_speed: d.speed })
    const mine = ++turn
    restore()
    if (!animated()) {
      window.scrollTo(pageScrollTarget())
      return
    }
    const current = leave()
    await current.out
    if (mine !== turn || run !== current) return
    window.scrollTo({ left: 0, top: 0 })
    arrive()
  })
}
