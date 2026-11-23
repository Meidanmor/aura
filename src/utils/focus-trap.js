/**
 * Keyboard focus for panels that cover the page (the Menu, Mini Cart and Mini
 * Wishlist drawers): while one is open, Tab stays inside it, Escape closes it,
 * and when it closes, focus goes back to the button that opened it.
 * (WCAG 2.1.2, 2.4.3; Quasar's q-dialog does this by itself, q-drawer doesn't.)
 *
 *   const release = trapFocus(asideEl, { label: 'Menu', onEscape: close })
 *   release()   // on close: back to the opener
 */

const FOCUSABLE = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', 'audio[controls]', 'video[controls]',
  '[contenteditable]:not([contenteditable="false"])', '[tabindex]:not([tabindex="-1"])',
].join(',')

const shown = (el) => {
  if (el.closest('[aria-hidden="true"], [inert]')) return false
  const r = el.getBoundingClientRect()
  if (!r.width && !r.height) return false
  return getComputedStyle(el).visibility !== 'hidden'
}

export function focusables(root) {
  return root ? [...root.querySelectorAll(FOCUSABLE)].filter(shown) : []
}

export function trapFocus(root, { label = '', onEscape = null, returnTo = null } = {}) {
  if (!root || typeof document === 'undefined') return () => {}
  const opener = returnTo || (document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const had = {
    role: root.getAttribute('role'),
    modal: root.getAttribute('aria-modal'),
    label: root.getAttribute('aria-label'),
    tabindex: root.getAttribute('tabindex'),
  }
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  if (label) root.setAttribute('aria-label', label)
  if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1')

  // The first thing to use inside (not the Close button when there's more), else the panel itself.
  const first = () => {
    const list = focusables(root)
    const pick = list.find((el) => !/close|סגיר/i.test(el.getAttribute('aria-label') || '')) || list[0]
    ;(pick || root).focus({ preventScroll: true })
  }
  const timer = setTimeout(first, 60)

  const onKey = (e) => {
    if (e.key === 'Escape' && onEscape) {
      e.stopPropagation()
      onEscape()
      return
    }
    if (e.key !== 'Tab') return
    const list = focusables(root)
    if (!list.length) {
      e.preventDefault()
      root.focus({ preventScroll: true })
      return
    }
    const a = list[0]
    const z = list[list.length - 1]
    const now = document.activeElement
    if (e.shiftKey && (now === a || now === root || !root.contains(now))) {
      e.preventDefault()
      z.focus()
    } else if (!e.shiftKey && (now === z || !root.contains(now))) {
      e.preventDefault()
      a.focus()
    }
  }
  // Focus that leaves by a click outside (the backdrop closes it) is fine; focus that
  // wanders out by script while open is brought back.
  const onFocusIn = (e) => {
    if (!root.contains(e.target)) first()
  }
  document.addEventListener('keydown', onKey, true)
  document.addEventListener('focusin', onFocusIn)

  return function release({ restore = true } = {}) {
    clearTimeout(timer)
    document.removeEventListener('keydown', onKey, true)
    document.removeEventListener('focusin', onFocusIn)
    for (const [attr, key] of [['role', 'role'], ['aria-modal', 'modal'], ['aria-label', 'label'], ['tabindex', 'tabindex']]) {
      if (had[key] === null) root.removeAttribute(attr)
      else root.setAttribute(attr, had[key])
    }
    // Back to the opener, unless the visitor already moved on (a link that changed the page).
    if (restore && opener && opener.isConnected && (!document.activeElement || document.activeElement === document.body || root.contains(document.activeElement))) {
      opener.focus({ preventScroll: true })
    }
  }
}

/**
 * Choice buttons marked role="radio" (product options, delivery or pickup, gift card
 * amounts, booking staff): the arrow keys move to the next / previous choice and pick it,
 * like real radio buttons (the next one is on the left on right-to-left pages).
 * Installed once by the layout.
 */
let radioKeysOn = false
export function installRadioKeys() {
  if (radioKeysOn || typeof document === 'undefined') return
  radioKeysOn = true
  document.addEventListener('keydown', (e) => {
    const el = e.target
    if (!(el instanceof HTMLElement) || el.getAttribute('role') !== 'radio') return
    const rtl = getComputedStyle(el).direction === 'rtl'
    const next = { ArrowDown: 1, ArrowUp: -1, ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key]
    if (!next) return
    const group = el.closest('[role="radiogroup"]') || el.parentElement
    const list = [...group.querySelectorAll('[role="radio"]')].filter((r) => !r.disabled && r.getAttribute('aria-disabled') !== 'true' && r.getClientRects().length)
    const i = list.indexOf(el)
    if (i < 0 || list.length < 2) return
    e.preventDefault()
    const to = list[(i + next + list.length) % list.length]
    to.focus()
    to.click()
  })
}
