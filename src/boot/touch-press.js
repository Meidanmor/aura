/**
 * Hover effects on touch screens (browser only).
 *
 * Phones have no hover. So a touch on an item with a hover effect (a section's
 * Link & hover, an Image block's hover, a loop template card) adds
 * `is-pressed` to it, and it stays, like a hover, until a touch starts
 * somewhere outside it. Touching it again keeps it on. The CSS next to each
 * `:hover` rule also matches `.is-pressed`. A touch that turns into a scroll
 * (pointercancel) takes it off the items that touch turned on, so scrolling
 * through a grid doesn't leave cards pressed.
 */
const PRESSABLE = '.sb-hover-zoom, .sb-hover-darken, .sb-hover-lift, .ib-hover-zoom .image-block__frame, .ib-hover-darken .image-block__frame, .ib-hover-swap .image-block__frame, .lt-card'

let pressed = []
// The ones the current touch turned on (it may still become a scroll).
let fresh = []

function chainOf (target) {
  const out = []
  let el = target instanceof Element ? target.closest(PRESSABLE) : null
  while (el) {
    out.push(el)
    el = el.parentElement?.closest(PRESSABLE) || null
  }
  return out
}

function onDown (e) {
  if (e.pointerType === 'mouse') return
  const chain = chainOf(e.target)
  for (const el of pressed) if (!chain.includes(el)) el.classList.remove('is-pressed')
  fresh = chain.filter((el) => !pressed.includes(el))
  for (const el of fresh) el.classList.add('is-pressed')
  pressed = chain
}

function onCancel (e) {
  if (e.pointerType === 'mouse' || !fresh.length) return
  for (const el of fresh) el.classList.remove('is-pressed')
  pressed = pressed.filter((el) => !fresh.includes(el))
  fresh = []
}

function releaseAll () {
  for (const el of pressed) el.classList.remove('is-pressed')
  pressed = []
  fresh = []
}

export default ({ router }) => {
  if (typeof document === 'undefined') return
  document.addEventListener('pointerdown', onDown, { passive: true })
  document.addEventListener('pointerup', () => { fresh = [] }, { passive: true })
  document.addEventListener('pointercancel', onCancel, { passive: true })
  // A page kept in memory (back button) comes back without a pressed item.
  router?.afterEach(releaseAll)
}
