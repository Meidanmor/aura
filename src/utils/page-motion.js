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
 * footer are marked with data-page-move="out" | "in" and data-page-anim: attributes, not
 * classes, because Vue
 * rewrites an element's classes when the page changes. CSS: the end of src/css/app.css.
 * Browser only.
 */
import { nextTick } from 'vue'
import { isNavigationFailure, NavigationFailureType } from 'vue-router'
import { isEditorMessage } from 'src/utils/config-loader.js'

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

// What moves: the layout's <main> and the footer. The header, the bar above it and the
// announcement bar don't take part (owner, 2026-11-24: a bar above the header fading in with the
// page looked odd); a top bar that had scrolled out of view slides down instead (topBars / slideIn).
// Never .q-page-container, .q-layout or #q-app: the
// storefront turns animations off there (animation: none !important), so a class there never plays.
function movers() {
  const list = []
  const main = document.querySelector('.q-page-container > main')
  if (main) list.push(main)
  const footer = document.querySelector('.q-layout > footer')
  if (footer) list.push(footer)
  return list
}

// The bars above the header that had scrolled out of view: the new page starts at the top, so they
// come back. They slide down from the top edge (the header and the page come down with them)
// instead of popping in.
const TOP_BARS = '.q-layout > .announcement-bar, .q-layout > .above-header'
function topBars() {
  // A bar still waiting above the edge from a move that a newer one cut short: back in its place first.
  untuck([...document.querySelectorAll(TOP_BARS)])
  return [...document.querySelectorAll(TOP_BARS)].filter((el) => el.getBoundingClientRect().bottom <= 0)
}
// Before the window scrolls up (still out of view): each bar waits above the top edge, so it never
// shows for a moment at its place before sliding.
function tuckBars(bars) {
  for (const el of bars) {
    const h = el.isConnected && typeof el.animate === 'function' ? el.offsetHeight : 0
    if (h) el.style.marginTop = `-${h}px`
  }
}
const untuck = (bars) => bars.forEach((el) => el.style.removeProperty('margin-top'))
function slideIn(bars, ms) {
  for (const el of bars) {
    const from = el.style.marginTop
    if (!from || !el.isConnected) continue
    el.animate([{ marginTop: from }, { marginTop: '0px' }], { duration: ms, easing: 'cubic-bezier(.22,.8,.3,1)' })
    el.style.removeProperty('margin-top')
  }
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
  const bars = topBars()
  const ms = Math.round(SPEED[motion.speed] * OUT_PART)
  for (const el of els) {
    clear(el)
    mark(el, 'out', motion.animation, ms)
  }
  let open
  const gap = new Promise((resolve) => { open = resolve })
  run = { els, bars, out: wait(ms), gap, open, animation: motion.animation }
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
  untuck(run.bars)
  run.open()
  run = null
}

/** Second half: the pages have swapped. The scroll goes first (still hidden), then the new page arrives. */
function arrive() {
  clearTimeout(stuckTimer)
  const current = run
  if (!current) return
  run = null
  tuckBars(current.bars)
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
    slideIn(current.bars, ms)
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
    if (!isEditorMessage(event) || !d || d.source !== 'qwoo-admin' || d.type !== 'page_motion') return
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
