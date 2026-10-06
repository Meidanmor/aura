// src/stores/products.js
import { ref } from 'vue'
import { getApiOrigin } from 'src/utils/server/get-api-origin'

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
 * limit, hide_out_of_stock. Uses the Store API; falls back to
 * products.json (filtered as closely as it can) when the API is down.
 */
async function queryProducts(q = {}, ssrContext = null) {
  const type = q.query_type || 'newest'
  const limit = Math.max(1, Math.min(24, Number(q.limit) || 8))

  if (type === 'manual') {
    return getFeaturedProducts(q.product_ids || [], ssrContext)
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
      return all.slice(0, limit)
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

// --- core fetchers ---
// ctx.ssrContext carries the per-request context when this runs inside a
// preFetch hook. Leave it undefined/null for client-triggered calls.
export async function preFetchProducts(ctx = {}) {
  try {
    if (!ctx.dryRun) {
      productsLoading.value = true
    }

    const {
      page = 1,
      per_page = 6,
      min_price,
      max_price,
      category,
      search,
      orderby,
      order,
      ssrContext = null,
    } = ctx


    // -------------------------
    // PRIMARY: store/v1 live API
    // -------------------------
    const query = new URLSearchParams()
    query.append('page', page)
    query.append('per_page', per_page)
    if (min_price !== undefined && !isNaN(min_price)) query.append('min_price', Math.round(min_price))
    if (max_price !== undefined && !isNaN(max_price)) query.append('max_price', Math.round(max_price))
    if (category)  query.append('category', category)
    if (search)    query.append('search', search)
    if (orderby && orderby !== 'menu_order') query.append('orderby', orderby)
    if (order)     query.append('order', order)

    const url = `${storeApiBase(ssrContext)}/products?${query.toString()}`

    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`API error: ${res.status}`)

      const data        = await res.json()
      const total       = res.headers.get('X-WP-Total')
      const totalPagesH = res.headers.get('X-WP-TotalPages')

      if (ctx.dryRun) {
        return {
          products:   data || [],
          total:      total       ? parseInt(total)       : 0,
          totalPages: totalPagesH ? parseInt(totalPagesH) : 1,
        }
      }

      products.value      = data || []
      totalProducts.value = total       ? parseInt(total)       : 0
      totalPages.value    = totalPagesH ? parseInt(totalPagesH) : 1

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
      const pages     = Math.ceil(total / per_page)
      const paginated = localProducts.slice((page - 1) * per_page, page * per_page)

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
async function fetchSingleProduct(slug, ssrContext = null) {
  // 1. Check if we already have it in the existing list
  const existing = products.value.find(p => {
    const pSlug = p.permalink?.split('/').filter(Boolean).pop()
    return pSlug === slug
  })

  if (existing) return existing

  // 2. If not, fetch it specifically from the API
  try {
    productsLoading.value = true
    const fetchSingleProduct = await fetch(`${storeApiBase(ssrContext)}/products/${slug}`)
    // No such product: an answer, not a failure — don't go looking by search.
    if (fetchSingleProduct.status === 404) return null
    if (!fetchSingleProduct.ok) throw new Error(`API error: ${fetchSingleProduct.status}`)

    const data = await fetchSingleProduct.json();

    if (data?.id) {
      products.value.push(data)
      return data
    }
  } catch (err) {
    console.error('Error fetching single product:', err)
    const results = await preFetchProducts({search: slug, api: true, ssrContext})
    const found = Array.isArray(results) ? results[0] : results?.products?.[0] ?? null
    if (found) {
      products.value.push(found)
      return found
    }
  } finally {
    productsLoading.value = false
  }
  return null
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

export default {
  products,
  categories,
  priceMeta,
  prefetchPriceMeta,
  prefetchCategories,
  productsLoading,
  initialized,
  preFetchProducts,
  fetchProductsIfNeeded,
  getById,
  getByIds,
  fetchSingleProduct,
  getFeaturedProducts,
  queryProducts,
  queryCategories,
  totalProducts,
  totalPages
}