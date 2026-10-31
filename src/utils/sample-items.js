/**
 * Sample items for the Store builder's live preview only: a store with no products (or posts,
 * categories, reviews) yet still shows its product grids, shop page and card designs with
 * something in them. Never on the live store: isEditorMode() is false outside the preview
 * frame and on the server, and the flag is set after mount so hydration matches.
 */
import { computed, onMounted, ref } from 'vue'
import { isEditorMode } from 'src/utils/config-loader.js'

// A plain drawn picture (no outside file): a soft background and a simple shape.
const picture = (bg, fg, shape) =>
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="800" height="800" fill="${bg}"/>${shape.replaceAll('FG', fg)}</svg>`)

const PICTURES = [
  picture('#ece7df', '#b9a58c', '<circle cx="400" cy="420" r="190" fill="FG"/><rect x="330" y="190" width="140" height="80" rx="20" fill="FG" opacity=".6"/>'),
  picture('#e3e9ee', '#8ea3b5', '<rect x="230" y="230" width="340" height="340" rx="40" fill="FG"/>'),
  picture('#efe4e6', '#c49aa1', '<path d="M400 200 L600 580 H200 Z" fill="FG"/>'),
  picture('#e6ece3', '#93a888', '<ellipse cx="400" cy="420" rx="230" ry="160" fill="FG"/>'),
]

const he = () => typeof document !== 'undefined' && document.documentElement.lang?.startsWith('he')
const T = (en, hebrew) => (he() ? hebrew : en)

function price(amount) {
  const symbol = he() ? '₪' : '$'
  return {
    price: String(amount * 100), regular_price: String(amount * 100), sale_price: String(amount * 100), price_range: null,
    currency_code: he() ? 'ILS' : 'USD', currency_symbol: symbol, currency_minor_unit: 2, currency_decimal_separator: '.',
    currency_thousand_separator: ',', currency_prefix: symbol, currency_suffix: '',
  }
}

export function sampleProducts(count = 4) {
  const names = [T('Sample product', 'מוצר לדוגמה'), T('Another product', 'עוד מוצר'), T('Third product', 'מוצר שלישי'), T('Fourth product', 'מוצר רביעי')]
  return Array.from({ length: count }, (_, i) => ({
    id: -(i + 1),
    name: names[i % names.length],
    slug: '',
    permalink: '',
    type: 'simple',
    sample: true,
    short_description: `<p>${T('Your products show here once you add them.', 'המוצרים שלכם יופיעו כאן אחרי שתוסיפו אותם.')}</p>`,
    prices: price([49, 89, 120, 35][i % 4]),
    images: [{ id: 0, src: PICTURES[i % 4], thumbnail: PICTURES[i % 4], srcset: '', sizes: '', name: '', alt: '' }],
    categories: [{ id: 0, name: T('Category', 'קטגוריה'), slug: '' }],
    average_rating: '0', review_count: 0,
    is_in_stock: true, is_purchasable: true, on_sale: false,
    attributes: [], variations: [], has_options: false,
    add_to_cart: { text: T('Add to cart', 'הוספה לסל'), description: '', minimum: 1, maximum: 1, multiple_of: 1 },
    extensions: {},
  }))
}

export function sampleCategories(count = 4) {
  const names = [T('Category', 'קטגוריה'), T('Another category', 'עוד קטגוריה'), T('Third category', 'קטגוריה שלישית'), T('Fourth category', 'קטגוריה רביעית')]
  return Array.from({ length: count }, (_, i) => ({ id: -(i + 1), name: names[i % 4], slug: '', count: 4, description: '', image: { src: PICTURES[i % 4], alt: '' }, sample: true }))
}

export function samplePosts(count = 3) {
  const now = Math.floor(Date.now() / 1000)
  return Array.from({ length: count }, (_, i) => ({
    id: -(i + 1), slug: '', sample: true,
    title: [T('Your first post', 'הפוסט הראשון שלכם'), T('Another post', 'עוד פוסט'), T('Third post', 'פוסט שלישי')][i % 3],
    excerpt: T('A short summary of the post shows here.', 'כאן מופיע תקציר קצר של הפוסט.'),
    date: now - i * 86400, day: '', categories: [{ id: 0, name: T('Blog', 'בלוג'), slug: '' }],
    image: { url: PICTURES[(i + 1) % 4], alt: '', width: 800, height: 800 },
  }))
}

export function sampleReviews(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    name: [T('A happy customer', 'לקוחה מרוצה'), T('Another customer', 'לקוח נוסף'), T('Third customer', 'לקוחה שלישית')][i % 3],
    rating: 5, verified: true, sample: true,
    review_text: T('A sample review. Real reviews from your customers show here.', 'ביקורת לדוגמה. ביקורות אמיתיות של הלקוחות שלכם יופיעו כאן.'),
    product_label: T('Sample product', 'מוצר לדוגמה'), product_url: '',
  }))
}

const SAMPLES = { product: sampleProducts, category: sampleCategories, post: samplePosts, review: sampleReviews }

/** Samples of a card design's kind (product | category | post | review). */
export const samplesOf = (type, count) => (SAMPLES[type] || sampleProducts)(count)

/** True in the Store builder's preview, after mount (so the server and the first browser render match). */
export function useEditorPreview() {
  const on = ref(false)
  onMounted(() => { on.value = isEditorMode() })
  return on
}

/** A list as it is, or samples in the Store builder's preview when it's empty. */
export function useSampleFallback(list, type = 'product', count = 4) {
  const editor = useEditorPreview()
  return computed(() => {
    const items = typeof list === 'function' ? list() : list.value
    return editor.value && Array.isArray(items) && !items.length ? samplesOf(type, count) : items
  })
}
