/**
 * The Store builder's live preview of the Cart and Checkout pages: with nothing in the cart,
 * the blocks get a sample cart (two sample products, a shipping choice) instead of the "empty"
 * message, so the owner sees and styles every block. Never on the live store: isEditorMode()
 * is false outside the preview frame and on the server, and the flag is set after mount so
 * hydration matches. The sample never reaches the real cart or the store: its actions do nothing.
 */
import { computed, markRaw, onMounted, reactive, ref } from 'vue'
import { isEditorMode } from 'src/utils/config-loader.js'
import { sampleProducts } from 'src/utils/sample-items.js'

const he = () => typeof document !== 'undefined' && document.documentElement.lang?.startsWith('he')
const T = (en, hebrew) => (he() ? hebrew : en)
const noop = async () => {}

function sampleCart() {
  const products = sampleProducts(2)
  const quantities = [1, 2]
  const money = { ...products[0].prices }
  delete money.price; delete money.regular_price; delete money.sale_price; delete money.price_range
  const items = products.map((p, i) => ({
    key: `sample-${i}`, id: p.id, quantity: quantities[i], name: p.name, permalink: '', sample: true,
    images: p.images, variation: [],
    prices: p.prices,
    totals: { ...money, line_total: String(Number(p.prices.price) * quantities[i]), line_subtotal: String(Number(p.prices.price) * quantities[i]) },
  }))
  const itemsTotal = items.reduce((sum, i) => sum + Number(i.totals.line_total), 0)
  const shipping = 2000
  const totals = {
    ...money, total_items: String(itemsTotal), total_discount: '0', total_shipping: String(shipping),
    total_tax: '0', total_price: String(itemsTotal + shipping),
  }
  const rates = [
    { rate_id: 'sample:1', name: T('Standard delivery', 'משלוח רגיל'), price: String(shipping), selected: true, ...money },
    { rate_id: 'sample:2', name: T('Pickup', 'איסוף עצמי'), price: '0', selected: false, ...money },
  ]
  const cartArray = {
    items, items_count: items.length, coupons: [], totals,
    shipping_rates: [{ package_id: 0, shipping_rates: rates }],
    payment_methods: [], billing_address: {}, shipping_address: {},
  }
  const state = reactive({
    items, items_count: items.reduce((n, i) => n + i.quantity, 0), coupons: [], totals,
    cart_array: cartArray, local_cart: { items: [] },
    offline: false, synced: true, loading: { cart: false }, error: null,
  })
  return markRaw({
    sample: true, state, hasItems: computed(() => true),
    increase: noop, decrease: noop, remove: noop, add: noop, applyCoupon: noop, removeCoupon: noop,
    fetchCart: noop, applyCheckoutCart: noop, placeOrder: noop,
    isOffline: () => false, needsSync: () => false,
  })
}

/**
 * The cart a cart / checkout page hands its blocks: the real one, or the sample while the
 * Store builder previews an empty cart. `previewing` says which.
 */
export function usePreviewCart(realCart) {
  const editor = ref(false)
  onMounted(() => { editor.value = isEditorMode() })
  let sample = null
  const previewing = computed(() => editor.value && !realCart.hasItems.value)
  const active = computed(() => (previewing.value ? (sample ||= sampleCart()) : markRaw(realCart)))
  return { cart: active, previewing }
}
