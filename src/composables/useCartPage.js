import { onMounted, provide, reactive, ref } from 'vue'
import cart from 'src/stores/cart'
import { useCartSummary } from 'src/composables/useCartSummary'
import { usePreviewCart } from 'src/utils/sample-cart.js'

const getSlugFromPermalink = (permalink) => {
  if (!permalink) return ''
  const cleanUrl = permalink.split('?')[0]
  const match = cleanUrl.match(/product\/([^/]+)\/?$/)
  return match ? match[1] : ''
}

const getVariationQuery = (item) => {
  if (!item.variation?.length) return {}
  return Object.fromEntries(item.variation.map((v) => [v.attribute, v.value]))
}

/**
 * What the cart blocks (src/components/blocks/shop/Cart*Block.vue) read and do:
 * provided as 'cartPage' by the cart page and by a cart drawer built from
 * blocks (DrawerSections.vue). The Store builder preview of an empty cart
 * shows a sample one (sample-cart.js).
 */
export function provideCartPage() {
  const preview = usePreviewCart(cart)
  const shown = () => preview.cart.value
  const {
    displayCart, cartTotal, cartItems, cartTotalDiscount, couponApplied, shippingOptions,
    selectedShippingRateId, couponCode, couponError,
    fetchShippingRates, onShippingMethodChange, applyCoupon, removeCoupon, loadingCoupon,
  } = useCartSummary(shown)

  const increase = (id) => shown().increase(id)
  const decrease = (id) => shown().decrease(id)
  const remove = (itemKey = null, itemAPIkey = null) => shown().remove(itemKey, itemAPIkey)

  const isHydrated = ref(false)
  onMounted(() => {
    isHydrated.value = true
    fetchShippingRates()
  })

  const context = reactive({
    cart: preview.cart, displayCart, cartTotal, cartItems, cartTotalDiscount, couponApplied, shippingOptions,
    selectedShippingRateId, couponCode, couponError, onShippingMethodChange, applyCoupon, removeCoupon, loadingCoupon,
    increase, decrease, remove, getSlugFromPermalink, getVariationQuery, isHydrated,
  })
  provide('cartPage', context)
  return context
}
