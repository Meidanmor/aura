/**
 * Gift cards on the storefront (the store's Qwoo_Gift_Cards).
 *
 * A gift card product carries extensions.qwoo_giftcard: { amounts, custom,
 * min, max, expiry, designs, palette, images, own_photo, max_message }. Its
 * page fills one shared state per product (the form and the email preview,
 * which the Product Gallery block shows in place of the photos), and adds
 * the card to the cart with its details (cart.addGiftCard).
 */
import { reactive } from 'vue'
import { formatCurrency } from 'src/utils/formatters.js'
import { currentLocale, t } from 'src/i18n/index.js'
import { fetchWithToken } from 'src/composables/useApiFetch.js'

export const giftSettings = (product) => {
  const g = product?.extensions?.qwoo_giftcard
  return g && Array.isArray(g.amounts) ? g : null
}

const states = new Map()

/** The shopper's choices for one gift card product (the same object for its form and preview). */
export function giftState(product) {
  const g = giftSettings(product)
  if (!g || !product?.id) return null
  // On the server every page starts fresh (nothing is kept between shoppers).
  if (typeof window === 'undefined') states.delete(product.id)
  if (!states.has(product.id)) {
    states.set(product.id, reactive({
      amount: g.amounts[0] ?? null,
      custom: !g.amounts.length,
      customText: '',
      design: g.designs?.[0]?.id || '',
      color: g.palette?.[0] || '#2f4a3a',
      image: '', // '' | 'p:<id>' | 'u:<name>'
      imageUrl: '',
      photo: '', // the shopper's photo while it uploads (data: address)
      to_name: '',
      to_email: '',
      from: '',
      message: '',
      when: 'now',
      send_on: '',
      send_time: '09:00',
    }))
  }
  return states.get(product.id)
}

/** Major units (200) → the store's money text, like its prices. */
export function giftMoney(amount, prices = {}) {
  const mu = prices.currency_minor_unit ?? 2
  return formatCurrency(String(Math.round(Number(amount || 0) * 10 ** mu)), {
    minorUnit: mu,
    decimalSeparator: prices.currency_decimal_separator,
    prefix: prices.currency_prefix,
    suffix: prices.currency_suffix,
  })
}

export const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
export const inAYearIso = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function dateLabel(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(currentLocale() || 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** The amount chosen, or null when it isn't one the store takes. */
export function chosenAmount(s, g) {
  if (!s || !g) return null
  if (!s.custom) return g.amounts.includes(Number(s.amount)) ? Number(s.amount) : null
  const n = Number(String(s.customText).trim().replace(',', '.'))
  if (!n || n < g.min || n > g.max) return null
  return Math.round(n * 100) / 100
}

/** "Valid until 24 November 2031" from the send day, or "Never expires". */
export function expiryLine(s, g) {
  if (!g?.expiry) return t('Never expires')
  const start = s?.when === 'date' && s.send_on ? s.send_on : todayIso()
  const [y, m, d] = start.split('-').map(Number)
  const end = new Date(y + g.expiry, m - 1, d)
  return t('Valid until {date}', { date: end.toLocaleDateString(currentLocale() || 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) })
}

/** What goes to the store with the cart line (Qwoo_Gift_Cards::clean_gift checks it all again). */
export function giftDetails(s, g) {
  return {
    amount: chosenAmount(s, g),
    to_name: s.to_name.trim(),
    to_email: s.to_email.trim(),
    from: s.from.trim(),
    message: s.message.slice(0, g.max_message || 300),
    send_on: s.when === 'date' ? s.send_on : '',
    send_time: s.when === 'date' ? s.send_time : '',
    design: s.design,
    // For the cart line only (the store keeps its own): what the shopper chose, by name.
    design_name: (g.designs || []).find((d) => d.id === s.design)?.name || '',
    image_url: s.imageUrl,
    color: s.color,
    image: s.image,
    key: Math.random().toString(36).slice(2, 14),
  }
}

/** Half-hour send times: "00:00" … "23:30" (the store's time). */
export const SEND_TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)

/** "24 November 2026, 09:00", or "Right after payment". */
export function sendLabel(gift) {
  if (!gift?.send_on) return t('Right after payment')
  return gift.send_time ? `${dateLabel(gift.send_on)}, ${gift.send_time}` : dateLabel(gift.send_on)
}

/** A cart line's short description: "To Noa · 24 November 2026, 09:00". */
export function giftLine(gift) {
  if (!gift) return ''
  return t('To {name} · {when}', { name: gift.to_name, when: sendLabel(gift) })
}

/** The shopper's time zone isn't the store's: the time picker says whose time it is. */
export function otherTimeZone(g) {
  try {
    return !!g?.timezone && Intl.DateTimeFormat().resolvedOptions().timeZone !== g.timezone
  } catch {
    return false
  }
}

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const safeColor = (c) => (/^#[0-9a-f]{6}$/i.test(c) ? c : '#2f4a3a')
const safeUrl = (u) => (/^(https:\/\/|data:image\/jpeg;base64,)[^"'\s<>]*$/i.test(u || '') ? u : '')

/** The store's email with {gc_*} places, filled in with the shopper's choices (every value escaped). */
export function fillPreview(template, s, g, product) {
  if (!template || !s || !g) return ''
  const design = (g.designs || []).find((d) => d.id === s.design) || g.designs?.[0] || {}
  const amount = chosenAmount(s, g)
  const img = safeUrl(s.photo || s.imageUrl)
  const radius = '12px'
  const values = {
    gc_color: safeColor(s.color),
    gc_title: esc(design.title || ''),
    gc_mark: esc(design.mark || ''),
    gc_mark_show: design.mark ? '' : 'display:none;',
    gc_img: esc(img),
    gc_img_show: img ? '' : 'display:none;',
    gc_band_radius: img ? `0 0 ${radius} ${radius}` : radius,
    gc_amount: esc(amount ? giftMoney(amount, product?.prices) : '—'),
    gc_code: 'XXXX-XXXX-XXXX-XXXX',
    gc_expiry: esc(expiryLine(s, g)),
    gc_to: esc(s.to_name.trim() || t('there')),
    gc_from: esc(s.from.trim()),
    gc_from_show: s.from.trim() ? '' : 'display:none;',
    gc_message: esc(s.message).replace(/\n/g, '<br>'),
    gc_msg_show: s.message.trim() ? '' : 'display:none;',
  }
  // The links in the preview go nowhere (and never open inside the frame).
  return template
    .replace(/\{(gc_[a-z_]+)\}/g, (m, k) => (k in values ? values[k] : ''))
    .replace(/\shref="[^"]*"/gi, '')
}

const templates = new Map()
/** The store's gift card email (same for every shopper), once per page visit. */
export async function loadTemplate(productId) {
  if (templates.has(productId)) return templates.get(productId)
  const job = fetchWithToken(`/wp-json/qwoo/v1/giftcard/preview?product=${encodeURIComponent(productId)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => d?.html || '')
    .catch(() => '')
  templates.set(productId, job)
  const html = await job
  if (!html) templates.delete(productId)
  return html
}

/**
 * The shopper's own photo: made smaller here (at most 1600px, JPG), then
 * saved by the store, which checks it and saves it again. { image, url }.
 */
export async function uploadPhoto(file, productId) {
  if (!/^image\/(jpeg|png|webp)$/.test(file?.type || '')) throw new Error(t('Choose a JPG or PNG photo.'))
  if (file.size > 25 * 1024 * 1024) throw new Error(t('The photo is too big. Choose a smaller one.'))
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) throw new Error(t('This file isn\'t a photo we can use.'))
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const data = canvas.toDataURL('image/jpeg', 0.85)
  const res = await fetchWithToken('/wp-json/qwoo/v1/giftcard/photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: productId, data }),
  })
  const out = await res.json().catch(() => null)
  if (!res.ok || !out?.image) throw new Error(out?.message || t('The photo couldn\'t be saved. Try again.'))
  return { image: out.image, url: out.url, preview: data }
}
