import { onBeforeUnmount, watch } from 'vue'

/** Pressing on these does what they do; the row doesn't start moving. */
const NO_DRAG = 'button, .q-btn, input, select, textarea, video'
const MOVED = 5 // px before a press counts as a drag
const FLICK_MS = 200 // how far ahead a flick carries, in the movement's own speed

/** The scroll position that lands each item where the row's snapping would put it. */
function snapPoints(el) {
  const cs = getComputedStyle(el)
  const rtl = cs.direction === 'rtl'
  const pad = parseFloat(cs.scrollPaddingInlineStart) || 0
  const box = el.getBoundingClientRect()
  const max = el.scrollWidth - el.clientWidth
  return [...el.children].map((child) => {
    const r = child.getBoundingClientRect()
    const left = el.scrollLeft + (rtl ? r.right - box.right + pad : r.left - box.left - pad)
    // Right-to-left rows scroll from 0 down.
    return rtl ? Math.min(0, Math.max(-max, left)) : Math.max(0, Math.min(max, left))
  })
}

function attach(el) {
  let press = null
  let dragging = false
  let skipClick = false
  let speed = 0
  let last = { x: 0, t: 0 }
  let settleTimer = null
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const release = () => {
    clearTimeout(settleTimer)
    el.removeEventListener('scrollend', release)
    el.style.scrollSnapType = ''
    el.style.scrollBehavior = ''
  }

  const onMove = (e) => {
    const dx = e.clientX - press.x
    if (!dragging) {
      if (Math.abs(dx) < MOVED) return
      dragging = true
      release()
      el.style.scrollSnapType = 'none'
      el.style.scrollBehavior = 'auto'
      el.classList.add('is-dragging')
    }
    e.preventDefault()
    el.scrollLeft = press.left - dx
    const dt = e.timeStamp - last.t
    if (dt > 0) speed = (e.clientX - last.x) / dt
    last = { x: e.clientX, t: e.timeStamp }
  }

  const onUp = (e) => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    if (!dragging) return
    dragging = false
    el.classList.remove('is-dragging')
    skipClick = e.type === 'pointerup'
    // The mouse stopped before letting go: no flick.
    const carried = e.timeStamp - last.t > 80 ? 0 : speed * FLICK_MS
    const aim = el.scrollLeft - carried
    const target = snapPoints(el).reduce((best, point) => (Math.abs(point - aim) < Math.abs(best - aim) ? point : best), el.scrollLeft)
    el.scrollTo({ left: target, behavior: reducedMotion() ? 'auto' : 'smooth' })
    // Snapping comes back when the row has arrived, so it doesn't jump on the way.
    el.addEventListener('scrollend', release)
    settleTimer = setTimeout(release, 700)
  }

  const onDown = (e) => {
    skipClick = false
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest?.(NO_DRAG)) return
    if (el.scrollWidth <= el.clientWidth + 1) return
    press = { x: e.clientX, left: el.scrollLeft }
    last = { x: e.clientX, t: e.timeStamp }
    speed = 0
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // The click at the end of a drag isn't a click on what's under the mouse (a link, a photo).
  const onClick = (e) => {
    if (!skipClick || e.detail === 0) return
    skipClick = false
    e.preventDefault()
    e.stopPropagation()
  }
  // The browser's own dragging of images and links would end the drag at once.
  const onDragStart = (e) => e.preventDefault()

  el.addEventListener('pointerdown', onDown)
  el.addEventListener('click', onClick, true)
  el.addEventListener('dragstart', onDragStart)

  return () => {
    release()
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    el.removeEventListener('pointerdown', onDown)
    el.removeEventListener('click', onClick, true)
    el.removeEventListener('dragstart', onDragStart)
  }
}

/**
 * Mouse dragging for a row that scrolls sideways with snapping (fingers already
 * scroll it). The row follows the mouse, then settles on the nearest item.
 * While dragging the element has the class `is-dragging`.
 */
export function useDragScroll(elRef) {
  let detach = null
  watch(elRef, (el) => {
    detach?.()
    detach = el ? attach(el) : null
  }, { flush: 'post' })
  onBeforeUnmount(() => detach?.())
}
