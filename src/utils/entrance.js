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

const NAMES = new Set(['fade_up', 'fade', 'zoom_in', 'reveal'])
const observers = {}

const nameOf = (value) => String(value || '').split(':')[0]

/** `tall`: an element taller than the screen never shows 12% of itself, so it plays as soon as it comes in. */
function getObserver(tall) {
  if (typeof IntersectionObserver === 'undefined') return null
  const key = tall ? 'tall' : 'normal'
  if (observers[key]) return observers[key]
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.dataset.anim = 'play'
      io.unobserve(entry.target)
    }
  }, tall ? { rootMargin: '0px 0px -15% 0px', threshold: 0 } : { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })
  return (observers[key] = io)
}

function unobserve(el) {
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
