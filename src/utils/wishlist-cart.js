import { ref } from 'vue'
import { Notify } from 'quasar'
import cart from 'src/stores/cart.js'
import wishlist from 'src/stores/wishlist.js'
import productsStore from 'src/stores/products'
import { zeroPriceButton } from 'src/utils/zero-price.js'
import { t } from 'src/i18n/index.js'

/**
 * The wishlist's products with their store data (price, type, images…), for the
 * Wishlist Items block and "Add the whole wishlist to the cart". Saved items keep
 * only a name and a picture, so the rest comes from the store.
 */
export async function wishlistProducts() {
  const ids = (wishlist.state.items || []).map((i) => Number(i.id)).filter(Boolean)
  if (!ids.length) return []
  const list = await productsStore.getFeaturedProducts(ids).catch(() => [])
  const byId = new Map((Array.isArray(list) ? list : []).map((p) => [Number(p.id), p]))
  return ids.map((id) => byId.get(id)).filter(Boolean)
}

/** Whether a product goes in the cart as it is (no options to choose, for sale). */
export function addsDirectly(product) {
  if (!product) return false
  if (['variable', 'grouped', 'external'].includes(product.type) || product.has_options === true) return false
  if (product.is_purchasable === false || product.is_in_stock === false) return false
  return !zeroPriceButton(product)
}

export const addingWishlist = ref(false)

/**
 * Button "When Clicked: Add the whole wishlist to the cart": every product that can
 * go in as it is; the ones that need a size or colour stay in the wishlist.
 */
export async function addWishlistToCart() {
  if (addingWishlist.value) return
  addingWishlist.value = true
  try {
    const products = await wishlistProducts()
    const ready = products.filter(addsDirectly)
    for (const product of ready) {
      await cart.add(product.id, 1, null, {}, null, product, false)
    }
    const left = (wishlist.state.items || []).length - ready.length
    const message = !ready.length
      ? t('These products need a choice first (a size, a colour…): open each one to add it.')
      : left > 0
        ? t('{n} added to the cart. The others need a choice first: open each one to add it.', { n: ready.length })
        : t('{n} added to the cart.', { n: ready.length })
    Notify.create({ type: ready.length ? 'positive' : 'info', message, timeout: 3500 })
  } finally {
    addingWishlist.value = false
  }
}
