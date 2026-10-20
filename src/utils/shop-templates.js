// The shop pages (All products, category pages, the product page, cart and
// checkout) are built from blocks, like the blog: Store builder → Shop pages.
// The same templates as the store's trait-sb-shop-templates.php:
//   - a config with `template: 1` is used as it is (its layouts too);
//   - an older config (sections in slots: each has a `location`) becomes the
//     default template with its sections where their slots were, so a store
//     that hasn't been updated yet looks the same;
//   - no config: the default template.

import { pickSections } from 'src/utils/layouts.js'

const LOCATIONS = {
  shop: ['before_breadcrumbs', 'after_breadcrumbs', 'before_filters', 'before_products_grid', 'after_products_grid', 'after_pagination'],
  product: ['before_breadcrumbs', 'after_breadcrumbs', 'before_product_images', 'after_product_images', 'before_add_to_cart_form', 'after_add_to_cart_form', 'after_product_summary', 'before_related_products', 'after_related_products'],
  cart: ['before_cart', 'before_cart_items', 'after_cart_items', 'before_cart_totals', 'after_cart_totals', 'after_cart'],
  checkout: ['before_checkout', 'before_customer_details', 'after_customer_details', 'before_order_review', 'before_place_order', 'after_checkout'],
}
LOCATIONS.category = LOCATIONS.shop

const rwd = (d, t = d, m = t) => ({ desktop: d, tablet: t, mobile: m })
const pad = (t, r, b, l) => ({ padding_preset: 'custom', padding: rwd({ top: t, right: r, bottom: b, left: l }) })

/** The default template of a shop page, with an older page's sections in their slots. */
export function shopTemplateSections(page, old = []) {
  const locations = LOCATIONS[page]
  if (!locations) return []
  const slots = {}
  for (const s of old || []) {
    if (!s) continue
    const loc = locations.includes(s.location) ? s.location : locations[0]
    ;(slots[loc] ||= []).push(s)
  }
  // Ids stay the same from one render to the next (the server's and the browser's must match).
  let n = 0
  const id = (prefix) => `${prefix}_dflt${page.slice(0, 3)}${++n}`
  const block = (type) => ({ id: id('blk'), type, enabled: true, style: {}, data: {} })
  const sec = (blocks, style = {}) => ({ id: id('sec'), enabled: true, style: { width_mode: 'contained', ...style }, blocks })
  const col = (blocks, width, style = {}) => ({ id: id('blk'), type: 'section', enabled: true, style: { width_mode: 'custom', width, padding_preset: 'none', ...style }, blocks })
  const top = (loc) => slots[loc] || []
  const inside = (loc) => (slots[loc] || []).map((s) => ({
    id: `blk_${String(s.id || '').replace(/^sec_/, '') || id('x')}`,
    type: 'section',
    label: s.label || '',
    enabled: s.enabled !== false,
    style: s.style || {},
    blocks: s.blocks || [],
  }))
  const types = (list) => list.map(block)

  switch (page) {
    case 'product':
      return [
        ...top('before_breadcrumbs'),
        sec([block('product_breadcrumbs')], pad('16', '16', '0', '16')),
        ...top('after_breadcrumbs'),
        sec([
          col([...inside('before_product_images'), block('product_gallery'), ...inside('after_product_images')], rwd('50%', '100%'), { gap: rwd('16px') }),
          col([
            ...types(['product_title', 'product_rating', 'product_categories', 'product_price', 'product_description', 'product_stock']),
            ...inside('before_add_to_cart_form'),
            block('product_add_to_cart'),
            ...inside('after_add_to_cart_form'),
            block('product_wishlist'),
            ...inside('after_product_summary'),
          ], rwd('50%', '100%'), { gap: rwd('16px') }),
        ], { ...pad('16', '16', '16', '16'), direction: rwd('row', 'column'), gap: rwd('24px') }),
        sec([block('product_reviews')], pad('0', '16', '0', '16')),
        ...top('before_related_products'),
        sec([block('product_related')], pad('0', '16', '16', '16')),
        ...top('after_related_products'),
      ]
    case 'shop':
    case 'category':
      return [
        ...top('before_breadcrumbs'),
        sec([block('archive_breadcrumbs')], pad('0', '16', '0', '16')),
        ...top('after_breadcrumbs'),
        sec([block('archive_title')], pad('0', '16', '0', '16')),
        sec([
          col([...inside('before_filters'), block('archive_filters')], rwd('25%', '25%', '100%'), { gap: rwd('25px') }),
          col([
            ...types(['archive_count', 'archive_sort']),
            ...inside('before_products_grid'),
            block('archive_products'),
            ...inside('after_products_grid'),
            block('archive_pagination'),
          ], rwd('75%', '75%', '100%'), { gap: rwd('16px') }),
        ], { ...pad('0', '16', '20', '16'), direction: rwd('row', 'row', 'column'), gap: rwd('20px') }),
        ...top('after_pagination'),
      ]
    case 'cart':
      return [
        sec([block('cart_title')], pad('16', '16', '0', '16')),
        ...top('before_cart'),
        ...top('before_cart_items'),
        sec([block('cart_items')], pad('0', '16', '0', '16')),
        ...top('after_cart_items'),
        ...top('before_cart_totals'),
        sec([block('cart_totals')], pad('16', '16', '16', '16')),
        ...top('after_cart_totals'),
        ...top('after_cart'),
      ]
    case 'checkout':
      return [
        sec([block('checkout_title')], pad('16', '16', '0', '16')),
        ...top('before_checkout'),
        sec([
          block('checkout_login'),
          {
            id: id('blk'), type: 'section', enabled: true,
            style: { width_mode: 'full', padding_preset: 'none', direction: rwd('row', 'row', 'column'), justify: rwd('space-between'), align_items: rwd('flex-start'), gap: rwd('16px') },
            blocks: [
              col([...inside('before_customer_details'), block('checkout_details'), ...inside('after_customer_details')], rwd('57%', '57%', '100%')),
              col([...inside('before_order_review'), block('checkout_summary'), ...inside('before_place_order'), block('checkout_place_order')], rwd('41%', '41%', '100%')),
            ],
          },
        ], { ...pad('16', '16', '16', '16'), gap: rwd('8px') }),
        ...top('after_checkout'),
      ]
  }
  return []
}

/**
 * The sections a shop page shows: its layout for this item (`match`, see
 * layouts.js) or its default, as a template.
 */
export function shopSections(page, config, match = () => false) {
  if (!config || (typeof config === 'object' && !Object.keys(config).length)) return shopTemplateSections(page)
  const picked = pickSections(config, match)
  return config.template ? picked : shopTemplateSections(page, picked)
}

/** The block's data value for this screen size's first value (responsive fields come as { desktop, … }). */
export const desktopOf = (v) => (v && typeof v === 'object' && 'desktop' in v ? v.desktop : v)
