import { bgImageUrls } from 'src/composables/useSectionStyle.js'

/**
 * The page's most important image (usually what the visitor sees first, and
 * Google's "Largest Contentful Paint"): picked from the page's first section,
 * per screen size, so the browser fetches it first.
 *
 *   - Images that are in the HTML (image block, carousel, post cover) get
 *     fetchpriority="high" and loading="eager" (the blocks ask isPicked()).
 *   - Images whose address is known from the config (backgrounds, image
 *     blocks, carousel slides) are also preloaded from the page's <head>
 *     (render.js), with a media query when screen sizes use different ones:
 *     a CSS background is otherwise found only once the CSS is applied.
 *   - Product blocks: their first cards get the priority.
 *
 * "First section": the first one shown on that screen size. On pages built
 * around slots (shop, category, product, cart, checkout) only slots above the
 * page's own content count; a section lower down is never first.
 */

export const DEVICES = ['desktop', 'tablet', 'mobile']

/** Media queries matching src/css/app.css (desktop >= 1024px, tablet 768–1023px, mobile <= 767px). */
const MEDIA = {
  desktop: '(min-width: 1024px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  mobile: '(max-width: 767px)',
  'desktop,tablet': '(min-width: 768px)',
  'tablet,mobile': '(max-width: 1023px)',
  'desktop,mobile': '(min-width: 1024px), (max-width: 767px)',
}

/** Slots above the page's own content, in page order. */
const TOP_SLOTS = {
  shop: ['before_breadcrumbs', 'after_breadcrumbs', 'before_filters', 'before_products_grid'],
  category: ['before_breadcrumbs', 'after_breadcrumbs', 'before_filters', 'before_products_grid'],
  product: ['before_breadcrumbs', 'after_breadcrumbs', 'before_product_images'],
  cart: ['before_cart'],
  checkout: ['before_checkout'],
}

const enabled = (n) => n && n.enabled !== false
const hiddenOn = (n, device) => !!n?.style?.hide_on?.[device]
const urlOf = (img) => (typeof img === 'string' ? img : img?.url || '')

function backgroundOf(style, device) {
  if (style?.bg_type === 'image') return bgImageUrls(style.bg_image)[device] || ''
  if (style?.bg_type === 'video') return urlOf(style.bg_video_poster)
  if (style?.bg_type === 'slideshow') {
    // The first image (its phone version on phones): the only one in the first paint.
    const first = (style.bg_slides || []).find((x) => urlOf(x?.image))
    if (first) return device === 'mobile' && urlOf(first.mobile_image) ? urlOf(first.mobile_image) : urlOf(first.image)
  }
  return ''
}

/** The first image of a container on one screen size: { kind: bg | img | products, url?, block? }. */
function pickIn(node, device) {
  const bg = backgroundOf(node.style, device)
  if (bg) return { kind: 'bg', url: bg }
  for (const b of (node.blocks || []).filter(enabled)) {
    if (hiddenOn(b, device)) continue
    if (b.type === 'section') {
      const inner = pickIn(b, device)
      if (inner) return inner
      continue
    }
    const own = backgroundOf(b.style, device)
    if (own) return { kind: 'bg', url: own }
    const d = b.data || {}
    switch (b.type) {
      case 'image_block': {
        const img = (d.images || []).find((i) => urlOf(i.image))
        if (img) return { kind: 'img', block: b.id, url: urlOf(img.image) }
        break
      }
      case 'carousel': {
        if (d.source === 'slides') {
          const s = (d.slides || []).find((x) => urlOf(x.image))
          if (s) return { kind: 'img', block: b.id, url: device === 'mobile' && urlOf(s.mobile_image) ? urlOf(s.mobile_image) : urlOf(s.image) }
        } else if (d.source === 'images' || d.source === 'logos') {
          const img = (d.images || []).find((i) => urlOf(i.image))
          if (img) return { kind: 'img', block: b.id, url: urlOf(img.image) }
        } else if (d.source === 'products') {
          return { kind: 'products', block: b.id }
        }
        break
      }
      case 'product_grid':
      case 'featured_products':
        return { kind: 'products', block: b.id }
      case 'post_featured_image':
      case 'product_gallery':
        // The post's cover / the product's first photo (its address comes with the item, not the config).
        return { kind: 'img', block: b.id }
      case 'archive_products':
        return { kind: 'products', block: b.id }
    }
  }
  return null
}

/**
 * { picks: { desktop, tablet, mobile }, blocks: Set of picked block ids,
 * any } for a page's sections. `page`: the SectionRenderer's page.
 */
export function pagePriority(sections, page) {
  const list = (sections || []).filter(enabled)
  const slots = TOP_SLOTS[page]
  // Older slot lists only (shop pages are templates now: src/utils/shop-templates.js).
  const ordered = slots && list.some((s) => s.location) ? slots.flatMap((loc) => list.filter((s) => s.location === loc)) : list
  const picks = {}
  const blocks = new Set()
  for (const device of DEVICES) {
    const first = ordered.find((s) => !hiddenOn(s, device))
    picks[device] = first ? pickIn(first, device) : null
    if (picks[device]?.block) blocks.add(picks[device].block)
  }
  return { picks, blocks, any: DEVICES.some((dv) => picks[dv]) }
}

/** <link rel="preload"> data for the picked images with a known address: [{ href, media }]. */
export function preloadLinks(priority) {
  const byUrl = new Map()
  for (const device of DEVICES) {
    const url = priority?.picks?.[device]?.url
    if (!url) continue
    if (!byUrl.has(url)) byUrl.set(url, [])
    byUrl.get(url).push(device)
  }
  return [...byUrl].map(([href, devices]) => ({ href, media: devices.length === 3 ? '' : MEDIA[devices.join(',')] || '' }))
}
