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

const MONEY_KEYS = ['currency_code', 'currency_symbol', 'currency_minor_unit', 'currency_decimal_separator', 'currency_thousand_separator', 'currency_prefix', 'currency_suffix']

// `storeMoney`: the store's currency fields (from the real, empty cart), else a guess by language.
function sampleCart(storeMoney) {
  const products = sampleProducts(2)
  const quantities = [1, 2]
  const money = storeMoney || Object.fromEntries(MONEY_KEYS.map((k) => [k, products[0].prices[k]]))
  const unit = 10 ** Number(money.currency_minor_unit ?? 2)
  for (const p of products) {
    const amount = String(Math.round((Number(p.prices.price) / 100) * unit))
    p.prices = { ...p.prices, ...money, price: amount, regular_price: amount, sale_price: amount }
  }
  const items = products.map((p, i) => ({
    key: `sample-${i}`, id: p.id, quantity: quantities[i], name: p.name, permalink: '', sample: true,
    images: p.images, variation: [],
    prices: p.prices,
    totals: { ...money, line_total: String(Number(p.prices.price) * quantities[i]), line_subtotal: String(Number(p.prices.price) * quantities[i]) },
  }))
  const itemsTotal = items.reduce((sum, i) => sum + Number(i.totals.line_total), 0)
  const shipping = 20 * unit
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
  // The empty cart's totals carry the store's currency (formatCurrency reads them too): load it once.
  onMounted(() => { if (editor.value && !realCart.state.cart_array?.totals) realCart.fetchCart?.().catch(() => {}) })
  const previewing = computed(() => editor.value && !realCart.hasItems.value)
  const storeMoney = computed(() => {
    const totals = realCart.state.cart_array?.totals
    return totals?.currency_code ? Object.fromEntries(MONEY_KEYS.map((k) => [k, totals[k]])) : null
  })
  const sample = computed(() => (previewing.value ? sampleCart(storeMoney.value) : null))
  const active = computed(() => sample.value || markRaw(realCart))
  return { cart: active, previewing }
}
