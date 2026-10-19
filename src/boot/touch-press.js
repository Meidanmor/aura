/**
 * Hover effects on touch screens (browser only).
 *
 * Phones have no hover, and a tap on a link opens it at once. So a touch on
 * an item with a hover effect (a section's Link & hover, an Image block's
 * hover, a loop template card) adds `is-pressed` to it while the finger is
 * down, and a moment after, so the effect plays while the link opens. The
 * CSS next to each `:hover` rule also matches `.is-pressed`. A touch that
 * turns into a scroll (pointercancel) takes it off right away.
 */
const PRESSABLE = '.sb-hover-zoom, .sb-hover-darken, .sb-hover-lift, .ib-hover-zoom .image-block__frame, .ib-hover-darken .image-block__frame, .ib-hover-swap .image-block__frame, .lt-card'
const AFTER_MS = 450

let pressed = []
let timer = 0

function release () {
  clearTimeout(timer)
  timer = 0
  for (const el of pressed) el.classList.remove('is-pressed')
  pressed = []
}

function onDown (e) {
  if (e.pointerType === 'mouse' || !(e.target instanceof Element)) return
  release()
  let el = e.target.closest(PRESSABLE)
  while (el) {
    el.classList.add('is-pressed')
    pressed.push(el)
    el = el.parentElement?.closest(PRESSABLE) || null
  }
}

function onUp (e) {
  if (e.pointerType === 'mouse' || !pressed.length) return
  clearTimeout(timer)
  timer = setTimeout(release, AFTER_MS)
}

export default () => {
  if (typeof document === 'undefined') return
  document.addEventListener('pointerdown', onDown, { passive: true })
  document.addEventListener('pointerup', onUp, { passive: true })
  document.addEventListener('pointercancel', release, { passive: true })
}
