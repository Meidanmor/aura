// src/utils/store-money.js
import { isEditorMode } from 'src/utils/config-loader.js'

/**
 * The store's currency (code, minor unit, symbol, prefix / suffix, separators), as the
 * Store API sends it with every price and cart. Remembered from the first real answer
 * (and kept in the browser for the next visit), so amounts written before the cart
 * answers (a cart kept in the browser, a page opened straight on /cart) use the store's
 * currency, never a "$" with two decimals guess ("$1.49" for a ₪149 cart, 2026-11-24).
 */
const KEYS = ['currency_code', 'currency_symbol', 'currency_minor_unit', 'currency_decimal_separator', 'currency_thousand_separator', 'currency_prefix', 'currency_suffix']
const STORAGE = 'qwoo_store_money'
let known = null

/** Whether `o` carries the store's currency fields. */
export function hasMoney(o) {
  return !!o && typeof o === 'object' && !!o.currency_code && o.currency_minor_unit !== undefined && o.currency_minor_unit !== null && o.currency_minor_unit !== ''
}

/** Remembers the currency of a Store API price or cart totals (not the cart's own local estimate). */
export function rememberMoney(o) {
  if (!hasMoney(o) || o._local) return
  // The Store builder preview's sample products carry a guessed currency: never kept.
  if (typeof window !== 'undefined' && isEditorMode()) return
  if (known && KEYS.every((k) => String(known[k] ?? '') === String(o[k] ?? ''))) return
  known = Object.fromEntries(KEYS.map((k) => [k, o[k] ?? '']))
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE, JSON.stringify(known)) } catch { /* storage blocked: memory only */ }
}

/** The store's currency fields, or null while none was seen yet (here or on an earlier visit). */
export function storeMoney() {
  if (known || typeof window === 'undefined') return known
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null')
    if (hasMoney(saved)) known = saved
  } catch { /* nothing kept */ }
  return known
}
