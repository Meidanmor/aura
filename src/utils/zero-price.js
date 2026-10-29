/**
 * Products with no price or a price of 0 (the store's Settings → General →
 * "Products with no price"). The store sends, per product,
 * `extensions.qwoo.zero_price` { action: buy | replace | hide, button, link: product | url, url }
 * (null for priced products) and refuses to add them to a cart unless the
 * action is buy. The price itself already carries the owner's text.
 */
import { t } from 'src/i18n/index.js'

/** null (sell it as usual), or { hide: true }, or { label, to | href, external }. */
export function zeroPriceButton(product, { onProductPage = false } = {}) {
  const zp = product?.extensions?.qwoo?.zero_price
  if (!zp || zp.action === 'buy' || !['replace', 'hide'].includes(zp.action)) return null
  if (zp.action === 'hide') return { hide: true }
  if (zp.link === 'url' && zp.url) {
    const url = String(zp.url)
    if (url.startsWith('/')) return { label: zp.button || t('Contact us'), to: url }
    if (/^(https?:|mailto:|tel:)/i.test(url)) return { label: zp.button || t('Contact us'), href: url, external: /^https?:/i.test(url) }
    return { hide: true }
  }
  // To the product's own page: on that page there's nowhere to go.
  if (onProductPage) return { hide: true }
  const slug = String(product.permalink || '').split('/').filter(Boolean).pop()
  return slug ? { label: zp.button || t('View product'), to: `/product/${slug}` } : { hide: true }
}

/** Props for a q-btn that follows the replacement's link. */
export const zeroPriceLink = (zb) => (zb?.to ? { to: zb.to } : zb?.href ? { href: zb.href, target: zb.external ? '_blank' : undefined, rel: zb.external ? 'noopener' : undefined } : {})
