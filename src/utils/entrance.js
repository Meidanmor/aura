/**
 * Entrance animations for sections and blocks (Store builder → Advanced →
 * Entrance Animation). Used as the v-entrance directive on a section, or on a
 * block's wrapper (SectionTemplate.vue), with "name:delay" (entranceOf() in
 * useSectionStyle.js; the delay itself is the --sb-anim-delay variable).
 *
 * Nothing is hidden by the server's HTML or the CSS alone: only after the
 * page runs, blocks that are still below the screen are hidden
 * (data-anim="wait") and play their animation once when they scroll in
 * (data-anim="play"). So the first paint, Google's view and visitors whose
 * scripts fail all see every block. Never in the page's first section or the
 * header, and never for visitors who turned animations off.
 *
 * In the Store builder's live preview, changing an animation or its delay
 * plays it again at once, so the owner sees what they picked.
 */
import { isEditorMode } from './config-loader.js'

const NAMES = new Set(['fade_up', 'fade', 'zoom_in', 'reveal', 'slide_start', 'slide_end', 'blur_in', 'flip', 'words'])
const observers = {}
let nearIo = null

// Pictures the animation shows (not the hidden hover / solid-header copies), at most a few.
const PICS = 'img:not([aria-hidden="true"]):not(.image-block__img--solid)'
const pics = (el) => Array.from(el.querySelectorAll(PICS)).slice(0, 8)
const WAIT_MAX = 2500

/**
 * Lazy pictures only start downloading when they're almost on screen, so on a
 * first visit the animation would play over an empty box and the picture would
 * pop in after it. A block waiting to animate starts its pictures a screen and
 * a half early instead.
 */
function nearObserver() {
  if (nearIo || typeof IntersectionObserver === 'undefined') return nearIo
  nearIo = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      for (const img of pics(entry.target)) if (img.loading === 'lazy') img.loading = 'eager'
      nearIo.unobserve(entry.target)
    }
  }, { rootMargin: '0px 0px 150% 0px' })
  return nearIo
}

/** Plays once the pictures inside have arrived (at most WAIT_MAX later, so a slow picture never keeps a block hidden). */
function play(el) {
  const waiting = pics(el).filter((img) => !img.complete)
  if (!waiting.length) { el.dataset.anim = 'play'; return }
  for (const img of waiting) if (img.loading === 'lazy') img.loading = 'eager'
  let done = false
  const go = () => { if (done) return; done = true; if (el.dataset.anim === 'wait') el.dataset.anim = 'play' }
  const timer = setTimeout(go, WAIT_MAX)
  let left = waiting.length
  const one = () => { if (--left <= 0) { clearTimeout(timer); go() } }
  for (const img of waiting) {
    img.addEventListener('load', one, { once: true })
    img.addEventListener('error', one, { once: true })
  }
}

const nameOf = (value) => String(value || '').split(':')[0]

/** `tall`: an element taller than the screen never shows 12% of itself, so it plays as soon as it comes in. */
function getObserver(tall) {
  if (typeof IntersectionObserver === 'undefined') return null
  const key = tall ? 'tall' : 'normal'
  if (observers[key]) return observers[key]
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      io.unobserve(entry.target)
      play(entry.target)
    }
  }, tall ? { rootMargin: '0px 0px -15% 0px', threshold: 0 } : { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })
  return (observers[key] = io)
}

function unobserve(el) {
  nearIo?.unobserve(el)
  observers.normal?.unobserve(el)
  observers.tall?.unobserve(el)
}

function skip(el) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true
  if (el.closest('header, .q-header')) return true
  // The page's first section: what the visitor sees first never waits.
  const section = el.closest('.sb-section')
  const first = document.querySelector('main .sb-section')
  return !!section && section === first
}

function start(el, name) {
  if (!NAMES.has(name) || skip(el)) return
  const r = el.getBoundingClientRect()
  // Already on screen (or above it): stays as it is.
  if (r.top < window.innerHeight * 0.92) return
  const io = getObserver(r.height > window.innerHeight)
  if (!io) return
  el.dataset.anim = 'wait'
  el.dataset.animName = name
  io.observe(el)
  if (el.querySelector(PICS)) whenLoaded(() => { if (el.dataset.anim === 'wait') nearObserver()?.observe(el) })
}

/** Early downloads start only after the page has finished loading, so they never compete with the first screen's pictures. */
function whenLoaded(fn) {
  if (document.readyState === 'complete') fn()
  else window.addEventListener('load', fn, { once: true })
}

function clear(el) {
  unobserve(el)
  delete el.dataset.anim
  delete el.dataset.animName
}

/** The live preview: play it now, wherever it is (the same rules as the store otherwise). */
function replay(el, name) {
  clear(el)
  if (!NAMES.has(name) || skip(el)) return
  el.dataset.animName = name
  el.dataset.anim = 'wait'
  el.getBoundingClientRect() // a layout in between restarts the animation, even when it's the same one
  el.dataset.anim = 'play'
}

export const vEntrance = {
  mounted(el, binding) {
    if (!binding.value) return
    // After the page has laid out, so positions are real.
    requestAnimationFrame(() => start(el, nameOf(binding.value)))
  },
  updated(el, binding) {
    if (binding.value === binding.oldValue || !isEditorMode()) return
    // After the new delay is on the element.
    requestAnimationFrame(() => replay(el, nameOf(binding.value)))
  },
  unmounted(el) {
    unobserve(el)
  },
}
