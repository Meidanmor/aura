// src/stores/products.js
import { ref } from 'vue'
import { getApiOrigin } from 'src/utils/server/get-api-origin'
import { plainSlug, sameSlug, slugOfPermalink } from 'src/utils/slug.js'
import { getPublicProductCatalog } from 'src/utils/product-catalog.js'

// STORE_API_BASE is no longer a module-level constant — it depended on
// process.env.VITE_API_BASE, which is fixed once at server boot and shared
// by every concurrent request this Node process handles. That's exactly
// the bug we're removing: the base URL must be derived PER REQUEST, from
// that request's own ssrContext, never cached at module scope.
function storeApiBase(ssrContext) {
  return `${getApiOrigin(ssrContext)}/wp-json/wc/store/v1`
}

// --- reactive state ---
const products = ref([])
const productsLoading = ref(false)
const initialized = ref(false)
export const totalProducts = ref(0)
export const totalPages = ref(1);
const categories = ref([]);
const priceMeta = ref(null);

async function getFeaturedProducts(ids = [], ssrContext = null) {
  if (!Array.isArray(ids) || !ids.length) return []

  try {
    const query = new URLSearchParams()
    query.append('include', ids.join(','))
    query.append('per_page', ids.length)

    const res = await fetch(
      `${storeApiBase(ssrContext)}/products?${query.toString()}`
    )

    if (!res.ok) throw new Error(`API error: ${res.status}`)

    const data = await res.json()

    // Update master store so other components benefit
    if (data?.length) {
      const masterMap = new Map(products.value.map(p => [p.id, p]))
      data.forEach(p => masterMap.set(p.id, p))
      products.value = Array.from(masterMap.values())

// Return in the requested ids order
      return ids.map(id => masterMap.get(Number(id))).filter(Boolean)
    }

    return data || []

  } catch (err) {
    console.error('[products store] getFeaturedProducts failed, trying fallback', err)

    // API failed (offline or server error) — use what's already in the
    // store, and fill any gaps from products.json. (Returning a PARTIAL
    // store hit — e.g. the one product a cart/product page loaded — left
    // carousels with a single product offline.)
    const masterMap = new Map(products.value.map(p => [p.id, p]))
    if (ids.some(id => !masterMap.has(Number(id)))) {
      // On the client this is a relative fetch (browser resolves it fine).
      // On the server it needs the same per-request origin as everything else.
      try {
        const fallbackUrl = `${getApiOrigin(ssrContext)}/data/products.json`
        const res = await fetch(fallbackUrl)
        const all = await res.json()
        const wanted = new Set(ids.map(Number))
        if (Array.isArray(all)) {
          all.forEach(p => {
            if (wanted.has(Number(p.id)) && !masterMap.has(Number(p.id))) masterMap.set(Number(p.id), p)
          })
        }
      } catch {
        // products.json unavailable too — return whatever the store has
      }
    }

    // In the requested order, like the online path.
    return ids.map(id => masterMap.get(Number(id))).filter(Boolean)
  }
}

async function getByIds(ids = [], ssrContext = null) {
  if (!Array.isArray(ids) || !ids.length) return []

  const masterMap = new Map(products.value.map(p => [p.id, p]))
  const existing = ids.map(id => masterMap.get(Number(id))).filter(Boolean)
  const missingIds = ids.filter(id => !masterMap.has(Number(id)))

  if (missingIds.length === 0) return existing

  try {
    // Parallel fetch for the missing items using the Store API endpoint
    const base = storeApiBase(ssrContext)
    const fetchPromises = missingIds.map(id =>
      fetch(`${base}/products/${id}`)
        .then(res => res.ok ? res.json() : null)
    )

    const fetchedMissing = (await Promise.all(fetchPromises)).filter(Boolean)

    // Merge into the Master List
    fetchedMissing.forEach(p => masterMap.set(p.id, p))
    products.value = Array.from(masterMap.values())

  } catch (err) {
    console.error('[products store] Store API getByIds failed', err)
  }

  return ids.map(id => masterMap.get(Number(id))).filter(Boolean)
}

/**
 * Products for a Shop Builder query (Product Grid / Carousel blocks).
 * `q` is the block data: query_type, category_ids, tag_ids, product_ids,
 * limit, hide_out_of_stock, exclude_ids (the product page's own product). Uses the Store API; falls back to
 * products.json (filtered as closely as it can) when the API is down.
 */
async function queryProducts(q = {}, ssrContext = null) {
  const type = q.query_type || 'newest'
  const limit = Math.max(1, Math.min(24, Number(q.limit) || 8))

  const exclude = (q.exclude_ids || []).map(Number).filter(Boolean)
  const keep = (list) => (exclude.length ? (list || []).filter((p) => !exclude.includes(Number(p.id))) : list)
  const inStock = (list) => (q.hide_out_of_stock ? (list || []).filter((p) => p.is_in_stock !== false) : list)

  if (type === 'manual') {
    return keep(await getFeaturedProducts((q.product_ids || []).filter((id) => !exclude.includes(Number(id))), ssrContext))
  }

  // Suggestions for the cart (src/utils/cart-suggestions.js): its cross-sells (cart_ids), else
  // "When There Are None" (cart_fallback): the newest products, the block's chosen products, or
  // nothing. Blocks saved before that choice: their chosen products, else the newest.
  // The server doesn't know the shopper's cart: null, the browser asks.
  if (type === 'cart') {
    if (import.meta.env.SSR) return null
    const fallback = ['newest', 'manual', 'none'].includes(q.cart_fallback) ? q.cart_fallback : (q.product_ids?.length ? 'manual' : 'newest')
    const ids = (q.cart_ids?.length ? q.cart_ids : fallback === 'manual' ? q.product_ids || [] : []).map(Number).filter((id) => id && !exclude.includes(id))
    if (!q.cart_ids?.length && fallback === 'newest') return queryProducts({ ...q, query_type: 'newest', cart_ids: [] }, ssrContext)
    return ids.length ? inStock(keep(await getFeaturedProducts(ids.slice(0, limit), ssrContext))) : []
  }

  // Recently viewed (src/utils/recently-viewed.js): kept in the shopper's browser, newest first.
  if (type === 'recent') {
    if (import.meta.env.SSR) return null
    const ids = (q.recent_ids || []).map(Number).filter((id) => id && !exclude.includes(id)).slice(0, limit)
    return ids.length ? inStock(keep(await getFeaturedProducts(ids, ssrContext))) : []
  }

  // "For you" is browser-only so one shopper's profile is never used during SSR.
  // Interest categories are derived from product categories already saved in this browser.
  if (type === 'for_you') {
    if (import.meta.env.SSR) return null
    const categoryIds = [...new Set((q.interest_category_ids || []).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))].slice(0, 20)
    const fallback = ['best_selling', 'newest', 'none'].includes(q.for_you_fallback) ? q.for_you_fallback : 'best_selling'
    let recommended = []
    if (categoryIds.length) {
      try {
        // Category affinity stays in the browser: rank the store's public catalog
        // locally rather than sending the shopper's interest categories to an API.
        const catalog = await getPublicProductCatalog()
        const rank = new Map(categoryIds.map((id, i) => [id, categoryIds.length - i]))
        recommended = (Array.isArray(catalog) ? catalog : [])
          .filter((p) => !exclude.includes(Number(p.id)) && (!q.hide_out_of_stock || p.is_in_stock !== false))
          .map((p, index) => ({ p, index, score: Math.max(0, ...(p.categories || []).map((c) => rank.get(Number(c.id)) || 0)) }))
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score || a.index - b.index)
          .map((x) => x.p)
          .slice(0, limit)
      } catch (err) {
        console.warn('[products store] for-you query failed', err)
      }
    }
    if (recommended.length >= limit || fallback === 'none') return recommended
    const used = new Set([...exclude, ...recommended.map((p) => Number(p.id))])
    const more = await queryProducts({ ...q, query_type: fallback, limit: limit - recommended.length, exclude_ids: [...used] }, ssrContext)
    return [...recommended, ...(Array.isArray(more) ? more.filter((p) => !used.has(Number(p.id))) : [])].slice(0, limit)
  }

  const query = new URLSearchParams()
  query.append('per_page', limit)
  switch (type) {
    case 'on_sale': query.append('on_sale', 'true'); break
    case 'featured': query.append('featured', 'true'); break
    case 'best_selling': query.append('orderby', 'popularity'); query.append('order', 'desc'); break
    case 'top_rated': query.append('orderby', 'rating'); query.append('order', 'desc'); break
    case 'category': query.append('category', (q.category_ids || []).join(',')); break
    case 'tag': query.append('tag', (q.tag_ids || []).join(',')); break
    default: query.append('orderby', 'date'); query.append('order', 'desc')
  }
  if (q.hide_out_of_stock) query.append('stock_status[]', 'instock')
  if (exclude.length) query.append('exclude', exclude.join(','))
  if ((type === 'category' && !q.category_ids?.length) || (type === 'tag' && !q.tag_ids?.length)) return []

  try {
    const res = await fetch(`${storeApiBase(ssrContext)}/products?${query.toString()}`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return (await res.json()) || []
  } catch (err) {
    console.warn('[products store] queryProducts failed, using products.json', err)
    try {
      let all
      if (import.meta.env.DEV && import.meta.env.SSR) {
        const { readFile } = await import('fs/promises')
        const { resolve } = await import('path')
        all = JSON.parse(await readFile(resolve(process.cwd(), 'public', 'data', 'products.json'), 'utf-8'))
      } else {
        all = await (await fetch(`${getApiOrigin(ssrContext)}/data/products.json`)).json()
      }
      if (type === 'on_sale') all = all.filter((p) => p.on_sale)
      if (type === 'category') {
        const ids = (q.category_ids || []).map(String)
        all = all.filter((p) => p.categories?.some((c) => ids.includes(String(c.id))))
      }
      if (type === 'tag') {
        const ids = (q.tag_ids || []).map(String)
        all = all.filter((p) => p.tags?.some((t) => ids.includes(String(t.id))))
      }
      if (q.hide_out_of_stock) all = all.filter((p) => p.is_in_stock !== false)
      return keep(all).slice(0, limit)
    } catch {
      return []
    }
  }
}

/**
 * Product categories for Shop Builder blocks: the given ids (in that order),
 * or — with no ids — every top-level category that has products.
 */
async function queryCategories(ids = [], ssrContext = null) {
  const query = ids.length ? `?include=${ids.join(',')}&per_page=100` : '?per_page=100'
  try {
    const res = await fetch(`${storeApiBase(ssrContext)}/products/categories${query}`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const json = await res.json()
    let list = Array.isArray(json) ? json : []
    if (ids.length) {
      const byId = new Map(list.map((c) => [c.id, c]))
      list = ids.map((id) => byId.get(Number(id))).filter(Boolean)
    } else {
      list = list.filter((c) => !c.parent && c.count > 0)
    }
    return list.map((c) => ({ id: c.id, name: c.name, slug: c.slug, image: c.image?.src || '', count: c.count }))
  } catch (err) {
    console.error('[products store] queryCategories failed', err)
    return []
  }
}

// Decimals the store's prices use (WooCommerce's "Number of decimals"). The
// Store API's min_price / max_price are in the smallest unit: ₪180 is 18000
// with 2 decimals but 180 with 0, so a fixed ×100 matched nothing on stores
// with 0 decimals. Learned from product answers (one store per deployment).
let minorUnit = null
function learnMinorUnit(list) {
  const u = Number(Array.isArray(list) ? list[0]?.prices?.currency_minor_unit : NaN)
  if (Number.isInteger(u) && u >= 0) minorUnit = u
}
async function priceMinorUnit(ssrContext) {
  if (minorUnit === null) {
    try {
      const res = await fetch(`${storeApiBase(ssrContext)}/products?per_page=1`)
      if (res.ok) learnMinorUnit(await res.json())
    } catch {
      // offline: the products.json fallback has the same units as the API
    }
  }
  return minorUnit ?? 2
}

/**
 * The shop's product attributes for the Filters block: [{ taxonomy, name, terms: [{ label, value }] }],
 * only values some product uses. [] when the store has none or can't be reached.
 */
export async function fetchAttributeOptions() {
  try {
    const base = storeApiBase(null)
    const res = await fetch(`${base}/products/attributes`)
    if (!res.ok) return []
    const list = await res.json()
    const out = await Promise.all((Array.isArray(list) ? list : []).map(async (attr) => {
      const r = await fetch(`${base}/products/attributes/${attr.id}/terms?hide_empty=true&orderby=menu_order`)
      const terms = r.ok ? await r.json() : []
      return {
        taxonomy: attr.taxonomy,
        name: attr.name,
        terms: (Array.isArray(terms) ? terms : []).filter(t => t.count !== 0).map(t => ({ label: t.name, value: Number(t.id) })),
      }
    }))
    return out.filter(a => a.taxonomy && a.terms.length)
  } catch {
    return []
  }
}

// --- core fetchers ---
// ctx.ssrContext carries the per-request context when this runs inside a
// preFetch hook. Leave it undefined/null for client-triggered calls.
// min_amount / max_amount are in whole currency (₪180), like the price filter.
export async function preFetchProducts(ctx = {}) {
  try {
    if (!ctx.dryRun) {
      productsLoading.value = true
    }

    const {
      page = 1,
      per_page = 6,
      min_amount,
      max_amount,
      category,
      search,
      orderby,
      order,
      attributes,
      ssrContext = null,
    } = ctx
    // The Products Grid's Query (gridQuery()): { params, inStock }.
    const rules = ctx.rules || null
    const in_stock = !!ctx.in_stock || !!rules?.inStock
    // lead: places on page 1 that aren't products (the Products Grid's promo card). Page 1 has
    // per_page - lead products, the next pages per_page each, starting right after them.
    const lead = Math.max(0, Math.min(Number(per_page) - 1, Number(ctx.lead) || 0))
    const take = page <= 1 ? per_page - lead : per_page
    const skip = page <= 1 ? 0 : (page - 1) * per_page - lead
    const pagesOf = (total) => (lead ? Math.max(1, Math.ceil((total + lead) / per_page)) : null)
    // Attribute filters { pa_taste: [termId…] } (any of a list's values, every list).
    const attrFilters = Object.entries(attributes || {}).filter(([, ids]) => Array.isArray(ids) && ids.length)


    // -------------------------
    // PRIMARY: store/v1 live API
    // -------------------------
    const hasMin = min_amount != null && !isNaN(min_amount)
    const hasMax = max_amount != null && !isNaN(max_amount)
    const scale = (hasMin || hasMax) ? 10 ** await priceMinorUnit(ssrContext) : 1
    const min_price = hasMin ? Math.floor(Number(min_amount) * scale) : undefined
    const max_price = hasMax ? Math.ceil(Number(max_amount) * scale) : undefined

    const query = new URLSearchParams()
    if (lead && page > 1) {
      query.append('offset', skip)
    } else {
      query.append('page', page)
    }
    query.append('per_page', take)
    if (min_price !== undefined) query.append('min_price', min_price)
    if (max_price !== undefined) query.append('max_price', max_price)
    if (category)  query.append('category', category)
    if (search)    query.append('search', search)
    if (orderby && orderby !== 'menu_order') query.append('orderby', orderby)
    if (order)     query.append('order', order)
    attrFilters.forEach(([tax, ids], i) => {
      query.append(`attributes[${i}][attribute]`, tax)
      ids.forEach((id) => query.append(`attributes[${i}][term_id][]`, id))
      query.append(`attributes[${i}][operator]`, 'in')
    })
    if (attrFilters.length > 1) query.append('attribute_relation', 'and')
    if (in_stock) query.append('stock_status[]', 'instock')
    for (const [k, v] of Object.entries(rules?.params || {})) query.append(k, v)

    const url = `${storeApiBase(ssrContext)}/products?${query.toString()}`

    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`API error: ${res.status}`)

      const data        = await res.json()
      const total       = res.headers.get('X-WP-Total')
      const totalPagesH = res.headers.get('X-WP-TotalPages')
      learnMinorUnit(data)
      const totalN = total ? parseInt(total) : 0
      const pagesN = pagesOf(totalN) ?? (totalPagesH ? parseInt(totalPagesH) : 1)

      if (ctx.dryRun) {
        return {
          products:   data || [],
          total:      totalN,
          totalPages: pagesN,
        }
      }

      products.value      = data || []
      totalProducts.value = totalN
      totalPages.value    = pagesN

      return products.value

    } catch (apiErr) {
      // -------------------------
      // FALLBACK: products.json
      // -------------------------
      console.warn('[products] API failed, using offline fallback', apiErr)

      let localProducts = []

      if (import.meta.env.DEV && import.meta.env.SSR) {
        const { readFile } = await import('fs/promises')
        const { resolve }  = await import('path')
        const filePath = resolve(process.cwd(), 'public', 'data', 'products.json')
        localProducts = JSON.parse(await readFile(filePath, 'utf-8'))

      } else {
        const fallbackUrl = `${getApiOrigin(ssrContext)}/data/products.json`
        const localRes = await fetch(fallbackUrl)
        if (!localRes.ok) throw new Error('products.json fallback failed')
        localProducts = await localRes.json()
      }

      // filtering
      if (category) {
        const categoryIds = String(category).split(',').map(id => id.trim()).filter(Boolean)
        localProducts = localProducts.filter(p =>
          p.categories?.some(c => categoryIds.includes(String(c.id))) ||
          categoryIds.includes(String(p.extensions?.qwoo?.default_category?.id))
        )
      }

      if (search) {
        const term = search.toLowerCase()
        localProducts = localProducts.filter(p => {
          const pSlug = p.permalink?.split('/').filter(Boolean).pop()
          return p.name?.toLowerCase().includes(term) || pSlug === term
        })
      }

      for (const [tax, ids] of attrFilters) {
        localProducts = localProducts.filter(p => (p.attributes || []).some(a => a.taxonomy === tax && (a.terms || []).some(t => ids.includes(Number(t.id)))))
      }

      if (in_stock) localProducts = localProducts.filter(p => p.is_in_stock !== false)

      // The Products Grid's Query, as near as the saved list allows.
      const rp = rules?.params || {}
      const idsOf = (v) => String(v || '').split(',').map(Number).filter(Boolean)
      const termIn = (list, ids) => (list || []).some((t) => ids.includes(Number(t.id)))
      if (rp.qq_ids) localProducts = localProducts.filter(p => idsOf(rp.qq_ids).includes(p.id))
      if (rp.qq_cats) localProducts = localProducts.filter(p => termIn(p.categories, idsOf(rp.qq_cats)))
      if (rp.qq_tags) localProducts = localProducts.filter(p => termIn(p.tags, idsOf(rp.qq_tags)))
      if (rp.qq_not_ids) localProducts = localProducts.filter(p => !idsOf(rp.qq_not_ids).includes(p.id))
      if (rp.qq_not_cats) localProducts = localProducts.filter(p => !termIn(p.categories, idsOf(rp.qq_not_cats)))
      if (rp.qq_not_tags) localProducts = localProducts.filter(p => !termIn(p.tags, idsOf(rp.qq_not_tags)))
      if (rp.on_sale) localProducts = localProducts.filter(p => p.on_sale)

      if (min_price !== undefined) {
        localProducts = localProducts.filter(p => parseFloat(p.prices?.price || 0) >= min_price)
      }

      if (max_price !== undefined) {
        localProducts = localProducts.filter(p => parseFloat(p.prices?.price || 0) <= max_price)
      }

      // sorting
      if (orderby === 'price') {
        localProducts.sort((a, b) => {
          const diff = parseFloat(a.prices?.price || 0) - parseFloat(b.prices?.price || 0)
          return order === 'desc' ? -diff : diff
        })
      } else if (orderby === 'date') {
        localProducts.sort((a, b) => {
          const diff = new Date(a.date_created) - new Date(b.date_created)
          return order === 'desc' ? -diff : diff
        })
      } else if (orderby === 'title') {
        localProducts.sort((a, b) => {
          const diff = a.name.localeCompare(b.name)
          return order === 'desc' ? -diff : diff
        })
      } else if (orderby === 'popularity') {
        localProducts.sort((a, b) =>
          (b.extensions?.offline_order?.total_sales || 0) -
          (a.extensions?.offline_order?.total_sales || 0)
        )
      } else if (orderby === 'rating') {
        localProducts.sort((a, b) =>
          (b.extensions?.offline_order?.average_rating || 0) -
          (a.extensions?.offline_order?.average_rating || 0)
        )
      }

      // pagination
      const total     = localProducts.length
      const pages     = pagesOf(total) ?? Math.ceil(total / per_page)
      const paginated = localProducts.slice(skip, skip + take)

      if (ctx.dryRun) {
        return { products: paginated, total, totalPages: pages }
      }

      products.value      = paginated
      totalProducts.value = total
      totalPages.value    = pages

      return paginated
    }

  } catch (err) {
    console.error('[products store] catastrophic failure', err)
    return products.value || []

  } finally {
    productsLoading.value = false
  }
}

async function fetchProductsIfNeeded(ctx) {
  if (initialized.value && products.value.length) return products.value

  // 2) Fallback network
  await preFetchProducts(ctx)
  return products.value
}

// --- consumer helpers ---
// On the server this module is shared by every request (other visitors,
// other languages): it never answers from what an earlier request loaded.
const onServer = typeof window === 'undefined'

// Products opened one by one (product pages), by plain slug. Kept apart from
// `products` and `productsLoading`, which belong to the list the shop shows:
// opening a product from the shop must not turn that list into skeletons
// (or add a card to it) while the next page loads.
const bySlug = new Map()

async function fetchSingleProduct(slug, ssrContext = null) {
  // 1. Already loaded: opened before, or in the list the shop shows
  const key = plainSlug(slug)
  const existing = !onServer && (bySlug.get(key) || products.value.find(p => sameSlug(p.slug || slugOfPermalink(p.permalink), slug)))

  if (existing) return existing

  // 2. If not, fetch it specifically from the API
  try {
    const fetchSingleProduct = await fetch(`${storeApiBase(ssrContext)}/products/${encodeURIComponent(key)}`)
    // No such product: an answer, not a failure — don't go looking by search.
    if (fetchSingleProduct.status === 404) return null
    if (!fetchSingleProduct.ok) throw new Error(`API error: ${fetchSingleProduct.status}`)

    const data = await fetchSingleProduct.json();

    if (data?.id) {
      if (!onServer) bySlug.set(key, data)
      return data
    }
  } catch (err) {
    console.error('Error fetching single product:', err)
    // Look it up by search (without touching the shop's list).
    try {
      const res = await fetch(`${storeApiBase(ssrContext)}/products?per_page=1&search=${encodeURIComponent(key)}`)
      const found = res.ok ? (await res.json())?.[0] : null
      if (found?.id) {
        if (!onServer) bySlug.set(key, found)
        return found
      }
    } catch { /* the store can't be reached */ }
  }
  return null
}
// Products looked up one by one (the cart and wishlist need a product's
// details): kept apart from `products`, which is the list the shop shows.
const byId = new Map()

/** One product (or variation) by id: from what's loaded, else from the API. null when it doesn't exist. */
async function fetchById(id) {
  const key = Number(id)
  const known = !onServer && (getById(key) || byId.get(key))
  if (known) return known
  try {
    const res = await fetch(`${storeApiBase()}/products/${key}`)
    if (!res.ok) return null
    const data = await res.json()
    if (data?.id && !onServer) byId.set(key, data)
    return data?.id ? data : null
  } catch {
    return null
  }
}

function getById(id) {
  return products.value.find(p => p.id === id) || null
}

async function prefetchCategories(ssrContext = null) {
  try {
    const url = `${storeApiBase(ssrContext)}/products/categories`
    const apiCats = await fetch(url)
    const jsonCats = await apiCats.json()

    categories.value = jsonCats

  } catch {
    let localCategories = [];

    if (import.meta.env.DEV && import.meta.env.SSR) {
      const { readFile } = await import('fs/promises')
      const { resolve } = await import('path')
      const filePath = resolve(process.cwd(), 'public', 'data', 'categories.json')
      const raw = await readFile(filePath, 'utf-8')
      localCategories = JSON.parse(raw)
    } else {
      const url = `${getApiOrigin(ssrContext)}/data/categories.json`
      const localRes = await fetch(url)
      if (!localRes.ok) throw new Error('categories.json fallback failed')
      localCategories = await localRes.json()
    }

    categories.value = localCategories
  }

  return categories.value;
}

async function prefetchPriceMeta(cat = null, ssrContext = null) {
  try {
    let url = `${getApiOrigin(ssrContext)}/wp-json/qwoo/v1/products-meta`
    if (cat) {
      url += `?category=${cat}`
    } else {
      //cat = 'global';
    }
    const apiPriceMeta = await fetch(url)
    const jsonPriceMeta = await apiPriceMeta.json()
    priceMeta.value = jsonPriceMeta?.global ? jsonPriceMeta.global : jsonPriceMeta
  } catch {
    let localPriceMeta = [];

    if (import.meta.env.DEV && import.meta.env.SSR) {
      const { readFile } = await import('fs/promises')
      const { resolve } = await import('path')
      const filePath = resolve(process.cwd(), 'public', 'data', 'price-meta.json')
      const raw = await readFile(filePath, 'utf-8')
      localPriceMeta = JSON.parse(raw)
    } else {
      const url = `${getApiOrigin(ssrContext)}/data/price-meta.json`
      const localRes = await fetch(url)
      if (!localRes.ok) throw new Error('price-meta.json fallback failed')
      localPriceMeta = await localRes.json()
    }
    if (!cat || (Array.isArray(cat) && cat.length === 0)) {
      localPriceMeta = localPriceMeta?.global
    } else {
      const catIds = Array.isArray(cat)
        ? cat.map(String)
        : String(cat).split(',').map(id => id.trim()).filter(Boolean)

      if (catIds.length === 1) {
        localPriceMeta = localPriceMeta?.categories?.[catIds[0]]
      } else {
        const matched = catIds
          .map(id => localPriceMeta?.categories?.[id])
          .filter(Boolean)

        localPriceMeta = matched.length
          ? { min_price: Math.min(...matched.map(m => m.min_price)), max_price: Math.max(...matched.map(m => m.max_price)) }
          : localPriceMeta?.global
      }
    }

    priceMeta.value = localPriceMeta
  }

  return priceMeta.value;
}

/**
 * Pages 1…upTo of a list at once (Load more / Load while scrolling, opened at ?page=3):
 * { products, total, totalPages } with totalPages counted at per_page.
 */
export async function fetchProductPages(ctx = {}, upTo = 1) {
  const per = Math.max(1, Number(ctx.per_page) || 6)
  const last = Math.max(1, Math.min(50, Number(upTo) || 1))
  // lead: page 1 has that many fewer products (the promo card takes the place).
  const lead = Math.max(0, Math.min(per - 1, Number(ctx.lead) || 0))
  const pages = (r) => Math.max(1, Math.ceil(((r.total || 0) + lead) / per))
  if (per * last <= 100) {
    const r = await preFetchProducts({ ...ctx, lead: 0, page: 1, per_page: per * last - lead, dryRun: true })
    return { products: r.products || [], total: r.total || 0, totalPages: pages(r) }
  }
  const all = await Promise.all(Array.from({ length: last }, (_, i) => preFetchProducts({ ...ctx, page: i + 1, per_page: per, dryRun: true })))
  return { products: all.flatMap((r) => r?.products || []), total: all[0]?.total || 0, totalPages: pages(all[0] || {}) }
}

export default {
  products,
  categories,
  priceMeta,
  prefetchPriceMeta,
  prefetchCategories,
  productsLoading,
  initialized,
  preFetchProducts,
  fetchProductPages,
  fetchAttributeOptions,
  fetchProductsIfNeeded,
  getById,
  fetchById,
  getByIds,
  fetchSingleProduct,
  getFeaturedProducts,
  queryProducts,
  queryCategories,
  totalProducts,
  totalPages
}
