// src/utils/product-price.js
import { formatStoreAmount } from 'src/utils/formatters.js'
import { sanitizePriceHtml } from 'src/utils/sanitizeHtml.js'
import { t } from 'src/i18n/index.js'

/**
 * A product's (or a chosen variation's) price as HTML, built from the Store API's
 * numbers (`prices`) in the store's own format (formatStoreAmount). Never the store's
 * ready-made `price_html`: it carries hidden English text ("Price range: ₪159 through
 * ₪199") and the backend's markup, which showed on the storefront (owner, 2026-11-24).
 *
 * mode: 'range' (lowest – highest for products with options), 'lowest', or 'from'
 * ("From ₪159"). On sale: the old price struck through, then the price.
 * amountClass: a class for each amount (product cards style theirs).
 * Returns escaped HTML, or '' when there's no price.
 */
export function productPriceHtml(item, { mode = 'range', amountClass = '' } = {}) {
  const p = item?.prices
  if (!p || p.price === undefined || p.price === null || p.price === '') return storeText(item)
  const wrap = (html) => (html && amountClass ? `<span class="${amountClass}">${html}</span>` : html)
  const amount = (minor) => wrap(formatStoreAmount(p, minor))
  const range = p.price_range
  if (range && range.min_amount !== range.max_amount) {
    const low = amount(range.min_amount)
    const high = amount(range.max_amount)
    if (!low || !high) return storeText(item)
    if (mode === 'lowest') return low
    if (mode === 'from') return t('From {price}', { price: low })
    return `${low} – ${high}`
  }
  const now = amount(p.price)
  if (!now) return storeText(item)
  const onSale = Number(p.regular_price) > Number(p.price) && formatStoreAmount(p, p.regular_price)
  // Screen readers hear which price is which (the store's hidden English text did that before).
  const sr = (text) => `<span class="screen-reader-text">${text}</span>`
  return onSale ? `<del>${sr(t('Old price:'))}${amount(p.regular_price)}</del> <ins>${sr(t('Price now:'))}${now}</ins>` : now
}

// Only when the numbers are missing (older answers): the store's text without its hidden part.
function storeText(item) {
  const html = String(item?.price_html || '').replace(/<span class="screen-reader-text">[\s\S]*?<\/span>/g, '')
  return sanitizePriceHtml(html)
}
