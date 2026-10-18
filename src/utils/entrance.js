/**
 * Entrance animations for single blocks (Store builder → block → Advanced →
 * Entrance Animation). Used as the v-entrance directive on a block's wrapper
 * (SectionTemplate.vue) with the animation's name.
 *
 * Nothing is hidden by the server's HTML or the CSS alone: only after the
 * page runs, blocks that are still below the screen are hidden
 * (data-anim="wait") and play their animation once when they scroll in
 * (data-anim="play"). So the first paint, Google's view and visitors whose
 * scripts fail all see every block. Never in the page's first section or the
 * header, and never for visitors who turned animations off.
 */

const NAMES = new Set(['fade_up', 'fade', 'zoom_in', 'reveal'])
let observer = null

function getObserver() {
  if (observer || typeof IntersectionObserver === 'undefined') return observer
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.dataset.anim = 'play'
      observer.unobserve(entry.target)
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })
  return observer
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
  const io = getObserver()
  if (!io) return
  el.dataset.anim = 'wait'
  el.dataset.animName = name
  io.observe(el)
}

export const vEntrance = {
  mounted(el, binding) {
    if (!binding.value) return
    // After the page has laid out, so positions are real.
    requestAnimationFrame(() => start(el, binding.value))
  },
  unmounted(el) {
    observer?.unobserve(el)
  },
}
