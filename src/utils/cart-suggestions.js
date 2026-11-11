import { computed, inject, onMounted, ref } from 'vue'
import cartStore from 'src/stores/cart.js'

/**
 * Product Grid / Carousel "Show: Suggestions for the cart": the cross-sells of the
 * products in the shopper's cart (WooCommerce → product → Linked products), which
 * come with every cart answer (Store API cart.cross_sells), less what's already in
 * the cart. Known in the browser only (the server doesn't know the shopper's cart).
 *
 * Returns a computed { ids, exclude, paths } for queryProducts (cart_ids, exclude_ids);
 * `paths` are the cart products' page addresses, for notInCart() below.
 * `always` (the cart's "You may also like"): what's in the cart is left out whatever the
 * list shows (recently viewed, for you), not only for the cart's own suggestions.
 */
const pathOf = (permalink) => {
  try {
    return new URL(String(permalink || ''), 'http://x').pathname.replace(/\/+$/, '')
  } catch {
    return ''
  }
}

/**
 * A list without what's already in the cart. A product with options sits in the cart as its
 * chosen variation (another id), so the product's page address is compared too.
 */
export function notInCart(list, suggestions) {
  if (!Array.isArray(list)) return list
  const ids = suggestions?.exclude || []
  const paths = suggestions?.paths || []
  if (!ids.length && !paths.length) return list
  return list.filter((p) => !ids.includes(Number(p.id)) && !(p.permalink && paths.includes(pathOf(p.permalink))))
}

export function useCartSuggestions(getData, { always = false } = {}) {
  // The cart page / cart drawer's cart; its preview sample has no suggestions, so the real one.
  const page = inject('cartPage', null)
  const mounted = ref(false)
  onMounted(() => { mounted.value = true })
  return computed(() => {
    const forCart = getData()?.query_type === 'cart'
    if ((!forCart && !always) || !mounted.value) return { ids: [], exclude: [], paths: [] }
    const c = page?.cart && !page.cart.sample ? page.cart : cartStore
    const items = c.state?.items || []
    const inCart = items.map((i) => Number(i.id)).filter(Boolean)
    const paths = [...new Set(items.map((i) => pathOf(i.permalink)).filter(Boolean))]
    const ids = forCart ? (c.state?.cart_array?.cross_sells || []).map((p) => Number(p?.id)).filter((id) => id && !inCart.includes(id)) : []
    return { ids, exclude: inCart, paths }
  })
}
