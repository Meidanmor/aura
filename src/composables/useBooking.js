/**
 * Appointments on the storefront: the store's /qwoo/v1/appointments routes
 * (qwoo-core-platform Qwoo_Appointments_Shop). Browser only: free times change
 * every minute, so nothing here runs on the server.
 *
 *   services()                 what can be booked (+ tz, currency, texts)
 *   times(service, from, to)   { days: { 'Y-m-d': [ { start, time, left? } ] } }
 *   hold(service, start, n)    keeps a time for 10 minutes → { hold, id, until }
 *   release(hold)              lets it go
 *   details(hold, form)        saves the form before a paid booking goes to the cart
 *   book(hold, form)           books a free (or pay-there) service → the booking + key
 *   manage(id, k[, action])    a booking by its link; cancel or move it
 *   mine()                     the signed-in shopper's bookings
 */
import { fetchWithToken } from 'src/composables/useApiFetch.js'

const API = '/wp-json/qwoo/v1/appointments'

async function call(path, options) {
  let res
  try {
    res = await fetchWithToken(`${API}/${path}`, { cache: 'no-store', ...options }, null, { skipNonceRetry: true })
  } catch {
    return { ok: false, status: 0, data: null }
  }
  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
}
const get = (path, params = {}) => call(`${path}?${new URLSearchParams(params).toString()}`, { method: 'GET' })
const post = (path, body) => call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const bookingApi = {
  services: (id = 0) => get('services', id ? { id } : {}),
  times: (service, from, to, seats = 1) => get('times', { service, from, to, seats }),
  hold: (service, start, seats = 1) => post('hold', { service, start, seats }),
  release: (hold) => post('release', { hold }),
  details: (hold, form) => post('details', { hold, ...form }),
  book: (hold, form) => post('book', { hold, ...form }),
  manage: (id, k) => get('manage', { id, k }),
  act: (id, k, action, start = '') => post('manage', { id, k, action, start }),
  mine: () => get('mine'),
}

/** The shopper's own time zone (null outside a browser). */
export const shopperZone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch { return '' }
}

/** Y-m-d of a date in a time zone. */
export function ymdIn(date, zone) {
  let fmt
  try {
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone: zone && zone.includes('/') ? zone : undefined, year: 'numeric', month: '2-digit', day: '2-digit' })
  } catch {
    fmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }
  const parts = fmt.formatToParts(date)
  const v = (t) => parts.find((p) => p.type === t)?.value
  return `${v('year')}-${v('month')}-${v('day')}`
}

/** Money in the store's currency. */
export function moneyText(n, currency, locale) {
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: Number(n) % 1 ? 2 : 0 }).format(Number(n) || 0) } catch { return String(n) }
}

/** The message a failed call carries, or a plain one. */
export const failText = (res, fallback) => (res?.data && typeof res.data.message === 'string' && res.data.message) || fallback
