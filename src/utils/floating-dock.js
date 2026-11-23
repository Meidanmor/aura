/**
 * One layout for every floating button (Store builder → Floating buttons): Contact, the cookie button,
 * Accessibility and Help. Each corner holds a stack, bottom to top in the owner's order, all the same size
 * with the same gap, so no button covers another. A bar across the bottom (the cookie banner, Add to home
 * screen, the floating Add To Cart bar) or a small fixed thing in a corner (a floating cart) lifts the stack
 * on its side.
 *
 * Shoppers may move a button the owner allowed: press and hold, drag; it snaps to the nearer side at the
 * height it was dropped, is remembered on this device (localStorage `qwoo_dock`) and comes back with the
 * reset badge, the accessibility panel's "Put the floating buttons back", or when the owner changes the
 * places (`reset`).
 *
 * Settings come from the live pointer (window.__QWOO_SITE__.floating, the store's shop_builder_options
 * `floating`): { size, edge, gap, reset, buttons: { id: { place: start | end | own, order, move, phone } } }.
 * `own` (Help only): where its own settings put it (a side tab, the middle of the bottom).
 * Browser only: the buttons are drawn after hydration.
 */
import { reactive } from 'vue'

export const DOCK_DEFAULTS = {
  size: 52,
  edge: 16,
  gap: 12,
  reset: 0,
  buttons: {
    contact: { place: 'start', order: 1, move: false, phone: true },
    cookie: { place: 'start', order: 2, move: false, phone: true },
    a11y: { place: 'end', order: 1, move: false, phone: true },
    help: { place: 'own', order: 2, move: false, phone: true },
  },
}
const KEY = 'qwoo_dock'
// Things that aren't ours but sit at the bottom: the stacks go above them.
const OBSTACLES = '.ia, .ckb-banner, .sticky-cart, .floating-cart, .widget-floating'

export const dock = reactive({
  cfg: DOCK_DEFAULTS,
  present: {}, // id → true while the button wants to show
  pos: {}, // id → { side: 'left' | 'right', bottom, idx, count, moved }
  moved: {}, // id → { side, y }: the shopper's own place (y = px from the bottom)
  lift: { left: 0, right: 0 },
  phone: false,
  dragging: '',
  badge: '', // the button just moved: its "back to place" shows for a moment
})

const num = (v, min, max, d) => (Number.isFinite(+v) ? Math.min(max, Math.max(min, Math.round(+v))) : d)
function readCfg() {
  const c = (typeof window !== 'undefined' && window.__QWOO_SITE__?.floating) || {}
  const buttons = {}
  for (const [id, d] of Object.entries(DOCK_DEFAULTS.buttons)) {
    const b = c.buttons?.[id] || {}
    const places = id === 'help' ? ['start', 'end', 'own'] : ['start', 'end']
    buttons[id] = {
      place: places.includes(b.place) ? b.place : d.place,
      order: num(b.order, 1, 9, d.order),
      move: b.move === undefined ? d.move : !!b.move,
      phone: b.phone === undefined ? d.phone : !!b.phone,
    }
  }
  return {
    size: [44, 52, 60].includes(+c.size) ? +c.size : DOCK_DEFAULTS.size,
    edge: num(c.edge, 8, 40, DOCK_DEFAULTS.edge),
    gap: num(c.gap, 6, 24, DOCK_DEFAULTS.gap),
    reset: Number(c.reset) || 0,
    buttons,
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ v: dock.cfg.reset, moved: dock.moved })) } catch { /* private window */ }
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (s && s.v === dock.cfg.reset && s.moved && typeof s.moved === 'object') {
      for (const [id, m] of Object.entries(s.moved)) {
        if (dock.cfg.buttons[id]?.move && (m.side === 'left' || m.side === 'right') && Number.isFinite(m.y)) dock.moved[id] = { side: m.side, y: m.y }
      }
    }
  } catch { /* nothing saved */ }
}

const physical = (place) => {
  const rtl = document.documentElement.dir === 'rtl'
  return place === 'start' ? (rtl ? 'right' : 'left') : (rtl ? 'left' : 'right')
}

function measure() {
  dock.phone = window.innerWidth < 600
  const lift = { left: 0, right: 0 }
  const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--qwoo-bottom-bar')) || 0
  if (bar) lift.left = lift.right = bar
  for (const el of document.querySelectorAll(OBSTACLES)) {
    if (el.closest('[data-dock]')) continue
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none') continue
    if (r.bottom < window.innerHeight - 160) continue
    const up = window.innerHeight - r.top + 8
    if (r.width > window.innerWidth * 0.6) {
      lift.left = Math.max(lift.left, up)
      lift.right = Math.max(lift.right, up)
    } else {
      const side = r.left + r.width / 2 < window.innerWidth / 2 ? 'left' : 'right'
      lift[side] = Math.max(lift[side], up)
    }
  }
  if (lift.left !== dock.lift.left || lift.right !== dock.lift.right) dock.lift = lift
}

/** Works out every button's place. Called whenever something changes. */
export function layoutDock() {
  if (typeof window === 'undefined') return
  const { size, edge, gap, buttons } = dock.cfg
  const pos = {}
  const shown = (id) => dock.present[id] && (!dock.phone || buttons[id].phone) && buttons[id].place !== 'own'
  const tops = {}
  for (const side of ['left', 'right']) {
    const ids = Object.keys(buttons)
      .filter((id) => shown(id) && !dock.moved[id] && physical(buttons[id].place) === side)
      .sort((a, b) => buttons[a].order - buttons[b].order)
    let y = edge + dock.lift[side]
    ids.forEach((id, idx) => {
      pos[id] = { side, bottom: y, idx, count: ids.length, moved: false }
      y += size + gap
    })
    tops[side] = y
  }
  for (const [id, m] of Object.entries(dock.moved)) {
    if (!shown(id)) continue
    // Never on top of the stack on its side: pushed above it. Never under the top of the screen.
    const most = window.innerHeight - size - 72
    pos[id] = { side: m.side, bottom: Math.max(0, Math.min(most, Math.max(m.y, tops[m.side]))), idx: 0, count: 1, moved: true }
  }
  dock.pos = pos
}

let started = false
/** Once, in the browser (MainLayout, after hydration). */
export function initDock() {
  if (started || typeof window === 'undefined') return
  started = true
  dock.cfg = readCfg()
  load()
  measure()
  layoutDock()
  // The cookie banner, Add to home screen and a floating Add To Cart bar come and go.
  setInterval(() => { measure(); layoutDock() }, 1000)
  window.addEventListener('resize', () => { measure(); layoutDock() })
}

/** A button says it's there (or gone). */
export function dockShow(id, on) {
  if (!started) initDock()
  if (!!dock.present[id] === !!on) return
  dock.present = { ...dock.present, [id]: !!on }
  layoutDock()
}

/** The button's place as inline style, or null when it isn't in the dock (Help in its own place). */
export function dockStyle(id) {
  const p = dock.pos[id]
  if (!p) return null
  const { size, edge } = dock.cfg
  // left / right inline: CSS left / right would be mirrored on right-to-left pages.
  return {
    position: 'fixed',
    [p.side]: `calc(${edge}px + env(safe-area-inset-${p.side}, 0px))`,
    bottom: `calc(${p.bottom}px + env(safe-area-inset-bottom, 0px))`,
    '--dock-size': `${size}px`,
    zIndex: 990,
    transition: dock.dragging === id ? 'none' : 'bottom .25s ease',
  }
}

/** Whether the button is in the dock and hidden on this screen (phones). */
export function dockHidden(id) {
  return dock.phone && !dock.cfg.buttons[id]?.phone
}

/** The shopper's own place forgotten: one button, or all of them. */
export function dockReset(id = '') {
  if (id) delete dock.moved[id]
  else Object.keys(dock.moved).forEach((k) => delete dock.moved[k])
  dock.badge = ''
  save()
  layoutDock()
}
export const dockHasMoved = () => Object.keys(dock.moved).length > 0

let badgeTimer = 0
/**
 * Press-and-hold dragging, for a button the owner allows to move. Use on the button's wrapper:
 * @pointerdown="drag.down($event, el)" and @click.capture="drag.click". A drag never also clicks.
 */
export function dockDrag(id) {
  let hold = 0, sx = 0, sy = 0, el = null, moved = false, pid = 0
  const move = (e) => {
    if (dock.dragging !== id) {
      // Moving before the hold ends: it's a scroll or a swipe, not a drag.
      if (hold && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) cancel()
      return
    }
    e.preventDefault()
    moved = true
    const s = dock.cfg.size
    el.style.left = `${Math.max(0, Math.min(window.innerWidth - s, e.clientX - s / 2))}px`
    el.style.right = 'auto'
    el.style.bottom = `${Math.max(0, Math.min(window.innerHeight - s, window.innerHeight - e.clientY - s / 2))}px`
  }
  const cancel = () => {
    clearTimeout(hold)
    hold = 0
    el?.classList.remove('dock-holding')
    window.removeEventListener('pointermove', move)
  }
  const up = (e) => {
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    cancel()
    if (dock.dragging !== id) return
    el.classList.remove('dock-dragging')
    try { el.releasePointerCapture(pid) } catch { /* already released */ }
    el.style.left = el.style.right = el.style.bottom = ''
    if (moved) {
      const side = e.clientX < window.innerWidth / 2 ? 'left' : 'right'
      dock.moved[id] = { side, y: Math.round(window.innerHeight - e.clientY - dock.cfg.size / 2) }
      save()
      dock.badge = id
      clearTimeout(badgeTimer)
      badgeTimer = setTimeout(() => { if (dock.badge === id) dock.badge = '' }, 6000)
    }
    setTimeout(() => { dock.dragging = '' }, 0)
    layoutDock()
  }
  return {
    down(e, target) {
      if (!dock.cfg.buttons[id]?.move || e.button > 0 || !target) return
      el = target
      sx = e.clientX
      sy = e.clientY
      pid = e.pointerId
      moved = false
      el.classList.add('dock-holding')
      window.addEventListener('pointermove', move, { passive: false })
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', up)
      hold = setTimeout(() => {
        hold = 0
        dock.dragging = id
        el.classList.remove('dock-holding')
        el.classList.add('dock-dragging')
        try { el.setPointerCapture(pid) } catch { /* fine without */ }
        navigator.vibrate?.(15)
      }, 400)
    },
    // The click that ends a drag does nothing.
    click(e) {
      if (dock.dragging === id || moved) {
        e.preventDefault()
        e.stopImmediatePropagation()
        moved = false
      }
    },
  }
}
