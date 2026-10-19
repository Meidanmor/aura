/**
 * Card designs (Store builder → Card designs): a card is drawn from the
 * owner's sections, and its own blocks (lp_*, lc_*, lpo_*, lr_*) show the
 * item of the card they're in. LoopCard.vue provides that item; the blocks
 * read it with useLoopItem().
 *
 *   type  product | category | post | review
 *   item  a Store API product, a category ({ id, name, slug, image, count,
 *         description }), a blog post (api/blog.js) or a testimonial
 *         ({ name, rating, review_text, verified, product_label, product_url })
 */
import { inject } from 'vue'
import { postDate } from 'src/api/blog.js'

export const LOOP_ITEM = Symbol('loopItem')

/** { type, item, priority } of the card this block is in (a computed ref), or null. */
export const useLoopItem = () => inject(LOOP_ITEM, null)

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' }

/** Plain text from the store's HTML (summaries, descriptions), the same on the server and in the browser. */
export function plainText(html) {
  return String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') {
        const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : ''
      }
      return ENTITIES[e.toLowerCase()] ?? m
    })
    .replace(/\s+/g, ' ')
    .trim()
}

const lastSegment = (url) => String(url || '').split('/').filter(Boolean).pop() || ''

/** Where the card leads ('' for reviews). */
export function loopItemUrl(type, item) {
  if (!item) return ''
  if (type === 'product') return item.permalink ? `/product/${lastSegment(item.permalink)}` : ''
  if (type === 'category') return item.slug ? `/product-category/${item.slug}` : ''
  if (type === 'post') return item.slug ? `/blog/${item.slug}` : ''
  return ''
}

/** The item's name (the card link's label for screen readers). */
export function loopItemName(type, item) {
  if (!item) return ''
  return plainText(type === 'post' ? item.title : item.name)
}

/** The card's image: { src, srcset, sizes, alt, width, height, second } or null. */
export function loopImage(type, item) {
  if (!item) return null
  if (type === 'product') {
    const [first, second] = item.images || []
    if (!first?.src) return null
    return { src: first.src, srcset: first.srcset, sizes: first.sizes, alt: first.alt || plainText(item.name), second: second?.src || '' }
  }
  if (type === 'category') {
    const img = item.image_data || item.image
    const src = typeof img === 'string' ? img : img?.src
    return src ? { src, srcset: img?.srcset, sizes: img?.sizes, alt: img?.alt || plainText(item.name) } : null
  }
  if (type === 'post') {
    const img = item.image
    return img?.url ? { src: img.url, alt: img.alt || '', width: img.width, height: img.height } : null
  }
  return null
}

/** The text a card block shows ('' hides it). */
export function loopText(blockType, item, d = {}) {
  if (!item) return ''
  switch (blockType) {
    case 'lp_title': return plainText(item.name)
    case 'lp_excerpt': return plainText(item.short_description)
    case 'lp_category': return plainText(item.categories?.[0]?.name)
    case 'lc_name': return plainText(item.name)
    case 'lc_count': {
      if (item.count == null) return ''
      const format = typeof d.format === 'string' && d.format.includes('{count}') ? d.format : '{count}'
      return format.replace('{count}', String(item.count))
    }
    case 'lc_description': return plainText(item.description)
    case 'lpo_title': return plainText(item.title)
    case 'lpo_date': return item.date ? postDate(item.date, item.day) : ''
    case 'lpo_excerpt': return plainText(item.excerpt)
    case 'lpo_category': return (item.categories || []).map((c) => plainText(c.name)).join(', ')
    case 'lr_text': {
      const text = String(item.review_text || '').trim()
      return text && d.quotes ? `“${text}”` : text
    }
    case 'lr_name': return String(item.name || '').trim()
    case 'lr_verified': return item.verified ? String(d.text || '').trim() : ''
    case 'lr_product': {
      const label = String(item.product_label || '').trim()
      return label ? label + (typeof d.suffix === 'string' ? d.suffix : '') : ''
    }
  }
  return ''
}
