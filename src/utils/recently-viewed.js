import { computed, inject, onMounted, ref } from 'vue'

/**
 * Recently viewed products: the ids of the last 20 product pages the shopper
 * opened, newest first, kept in this browser (localStorage) for later visits.
 * Product Grid / Carousel / Cart Suggestions "Show: Recently viewed" read it;
 * on a product page the product being viewed is left out.
 */
const KEY = 'qwoo_recently_viewed'
const MAX = 20
const ids = ref([])
let loaded = false

function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    ids.value = Array.isArray(list) ? list.map(Number).filter((id) => id > 0).slice(0, MAX) : []
  } catch {
    ids.value = []
  }
}

/** On a product page: this product is the newest one viewed. */
export function rememberViewed(id) {
  id = Number(id)
  if (!id || typeof window === 'undefined') return
  load()
  ids.value = [id, ...ids.value.filter((x) => x !== id)].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.value))
  } catch {
    // Private mode / storage full: the list lasts this visit only.
  }
}

/**
 * For a products block: { ids } of the recently viewed products while it shows
 * "Recently viewed" (browser only, after mount), less the page's own product.
 * `ready` says the browser's list was read (so "none yet" is known).
 */
export function useRecentlyViewed(getData) {
  const page = inject('productPage', null)
  const mounted = ref(false)
  onMounted(() => {
    load()
    mounted.value = true
  })
  return computed(() => {
    if (getData()?.query_type !== 'recent') return { ids: [], ready: false }
    if (!mounted.value) return { ids: [], ready: false }
    const current = Number(page?.product?.id) || 0
    return { ids: ids.value.filter((id) => id !== current), ready: true }
  })
}
