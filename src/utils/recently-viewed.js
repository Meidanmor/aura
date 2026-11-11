import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getPublicProductCatalog } from './product-catalog.js'
import { audienceReady, favouriteCategories } from './personalization.js'

/**
 * Recently viewed products: the ids of the last 20 product pages the shopper
 * opened, newest first, kept in this browser. “For you” derives category
 * affinity on demand from those existing ids; it writes no additional profile
 * and sends no shopper identity or browsing history to the backend.
 */
const KEY = 'qwoo_recently_viewed'
const MAX = 20
const ids = ref([])
let loaded = false
let interestCacheKey = ''
let interestCache = []

function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    ids.value = Array.isArray(list) ? list.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0).slice(0, MAX) : []
  } catch {
    ids.value = []
  }
}

/** On a product page: this product is newest in the existing browser list. */
export function rememberViewed(id) {
  id = Number(id)
  if (!Number.isSafeInteger(id) || id <= 0 || typeof window === 'undefined') return
  load()
  ids.value = [id, ...ids.value.filter((x) => x !== id)].slice(0, MAX)
  interestCacheKey = ''
  try { localStorage.setItem(KEY, JSON.stringify(ids.value)) } catch { /* private mode: current visit only */ }
  window.dispatchEvent(new CustomEvent('qwoo:recently-viewed'))
}

/**
 * Ranked categories derived in memory from the existing recently-viewed list.
 * The product details come from the store's public WooCommerce Store API.
 */
/**
 * "For you": the visitor's favourite categories from the store (Marketing → Audiences on:
 * what they viewed, carted and bought, on any device they signed in on), then the
 * categories of the products viewed in this browser.
 */
export async function getInterestedCategoryIds() {
  if (typeof window === 'undefined') return []
  await audienceReady(1500)
  const fromStore = favouriteCategories()
  const local = await localInterestedCategoryIds()
  return [...new Set([...fromStore, ...local])].slice(0, 30)
}

async function localInterestedCategoryIds() {
  load()
  const productIds = ids.value.slice(0, MAX)
  if (!productIds.length || typeof window === 'undefined') return []
  const cacheKey = productIds.join(',')
  if (cacheKey === interestCacheKey) return interestCache.slice()
  try {
    // Read the store's already-public product catalog so the shopper's list of
    // ids is never sent as an API query parameter for recommendation work.
    const catalog = await getPublicProductCatalog()
    const byId = new Map(catalog.map((product) => [Number(product?.id), product]))
    const viewed = productIds.map((id) => byId.get(id)).filter(Boolean)
    const score = new Map()
    viewed.forEach((product, index) => {
      const weight = productIds.length - index
      for (const category of Array.isArray(product?.categories) ? product.categories : []) {
        const categoryId = Number(category?.id)
        if (Number.isSafeInteger(categoryId) && categoryId > 0) score.set(categoryId, (score.get(categoryId) || 0) + weight)
      }
    })
    interestCache = [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([id]) => id)
    interestCacheKey = cacheKey
    return interestCache.slice()
  } catch {
    interestCache = []
    interestCacheKey = cacheKey
    return []
  }
}

/**
 * For a products block: the browser's product ids or in-memory category
 * interests. `ready` says the browser query has finished, even when empty.
 */
export function useRecentlyViewed(getData) {
  const page = inject('productPage', null)
  const mounted = ref(false)
  const categoryIds = ref([])
  const interestReady = ref(false)
  const refreshInterests = async (type) => {
    if (!mounted.value || type !== 'for_you') {
      categoryIds.value = []
      interestReady.value = false
      return
    }
    interestReady.value = false
    const next = await getInterestedCategoryIds()
    if (getData()?.query_type !== 'for_you') return
    categoryIds.value = next
    interestReady.value = true
  }
  onMounted(() => {
    load()
    mounted.value = true
    refreshInterests(getData()?.query_type)
    window.addEventListener('qwoo:recently-viewed', onViewed)
  })
  watch(() => getData()?.query_type, (type) => refreshInterests(type))
  const onViewed = () => refreshInterests(getData()?.query_type)
  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') window.removeEventListener('qwoo:recently-viewed', onViewed)
  })
  return computed(() => {
    const type = getData()?.query_type
    if (!['recent', 'for_you'].includes(type) || !mounted.value) return { ids: [], category_ids: [], ready: false }
    const current = Number(page?.product?.id) || 0
    return {
      ids: type === 'recent' ? ids.value.filter((id) => id !== current) : [],
      category_ids: type === 'for_you' ? categoryIds.value : [],
      ready: type !== 'for_you' || interestReady.value,
    }
  })
}
