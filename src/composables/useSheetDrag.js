/**
 * Bottom sheets on phones (Sort's list, Filters): drag the handle / title down to close.
 * Spread the returned listeners on the part you drag by (`v-on="drag"`, with `touch-action: none`);
 * the sheet is its nearest `[data-sheet]` parent. It follows the finger, and closes when pulled
 * past 30% of its height or flicked down; otherwise it springs back.
 */
export function useSheetDrag(close) {
  let sheet = null
  let startY = 0
  let startTime = 0
  let dy = 0

  function down(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // The close button and other controls in the title row stay clickable.
    if (e.target.closest('button, a, input')) return
    sheet = e.currentTarget.closest('[data-sheet]')
    if (!sheet) return
    startY = e.clientY
    startTime = performance.now()
    dy = 0
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* the pointer is already gone */ }
    sheet.style.transition = 'none'
  }
  function move(e) {
    if (!sheet) return
    dy = Math.max(0, e.clientY - startY)
    sheet.style.transform = `translateY(${dy}px)`
  }
  function up() {
    if (!sheet) return
    const el = sheet
    sheet = null
    const speed = dy / Math.max(1, performance.now() - startTime)
    el.style.transition = 'transform .2s ease'
    if (dy > el.offsetHeight * 0.3 || (dy > 40 && speed > 0.5)) {
      el.style.transform = 'translateY(100%)'
      close()
      // By then the sheet's own closed style holds it down (or it's gone).
      setTimeout(() => { el.style.transform = ''; el.style.transition = '' }, 300)
    } else {
      el.style.transform = ''
      setTimeout(() => { el.style.transition = '' }, 200)
    }
  }
  return { pointerdown: down, pointermove: move, pointerup: up, pointercancel: up }
}
