import { computed, inject, onMounted, ref } from 'vue'
import cartStore from 'src/stores/cart.js'

/**
 * Product Grid / Carousel "Show: Suggestions for the cart": the cross-sells of the
 * products in the shopper's cart (WooCommerce → product → Linked products), which
 * come with every cart answer (Store API cart.cross_sells), less what's already in
 * the cart. Known in the browser only (the server doesn't know the shopper's cart).
 *
 * Returns a computed { ids, exclude } for queryProducts (cart_ids, exclude_ids).
 */
export function useCartSuggestions(getData) {
  // The cart page / cart drawer's cart; its preview sample has no suggestions, so the real one.
  const page = inject('cartPage', null)
  const mounted = ref(false)
  onMounted(() => { mounted.value = true })
  return computed(() => {
    if (getData()?.query_type !== 'cart' || !mounted.value) return { ids: [], exclude: [] }
    const c = page?.cart && !page.cart.sample ? page.cart : cartStore
    const inCart = (c.state?.items || []).map((i) => Number(i.id)).filter(Boolean)
    const ids = (c.state?.cart_array?.cross_sells || []).map((p) => Number(p?.id)).filter((id) => id && !inCart.includes(id))
    return { ids, exclude: inCart }
  })
}
