<template>
    <!-- Built from the checkout template (Store builder → Shop pages → Checkout): the blocks
         read the cart and the form from this page (provide 'checkoutPage'). -->
    <div class="checkout-page">
      <div v-if="isProcessingOrder" class="processing-overlay">
        <q-spinner color="secondary" size="3em" />
        <div class="q-mt-md text-h6">{{ t('Processing your order…') }}</div>
      </div>

      <!-- Honeypot: real users never see or fill this. -->
      <div class="hp-field" aria-hidden="true">
        <label for="checkout-website">{{ t('Website') }}</label>
        <input
            id="checkout-website"
            v-model="honeypotField"
            type="text"
            name="website"
            tabindex="-1"
            autocomplete="off"
        />
      </div>

      <!-- Offline banner, at the top -->
      <div v-if="displayCart?._offline" class="bg-warning text-dark q-pa-sm q-ma-md rounded-borders">
        {{ t('You\'re offline. Your details are kept on this device. Connect to the internet to choose delivery and place your order.') }}
      </div>

      <SectionRenderer :sections="sections" page="checkout" />

      <div v-if="syncError" class="text-negative q-my-md text-center">
        {{ syncError }}
        <q-btn :label="t('Retry Sync')" color="secondary" @click="syncCart" class="q-ml-md" />
      </div>
    </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted, onUnmounted, useSSRContext, provide, markRaw } from 'vue';
import cart from 'src/stores/cart';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import { useQuasar } from 'quasar';
import {fetchWithToken} from 'src/composables/useApiFetch.js';
import SectionRenderer from 'components/sections/SectionRenderer.vue';
import { loadPageConfig, subscribeToLiveConfig } from 'src/utils/config-loader'

let unsubscribeConfigUpdates = () => {}
import { matError } from '@quasar/extras/material-icons'
import { shopSections } from 'src/utils/shop-templates.js'
import { getWasLoggedIn } from 'src/composables/useApiFetch.js'
import { defineAsyncComponent } from 'vue'
import { getAdapter } from 'src/payments/registry'
import { rememberGrowPayment, takeGrowPayment, checkGrowPayment } from 'src/payments/grow-return'
import { loadPaymentConfig, paymentConfig } from 'src/payments/config'
import { useHoneypot } from 'src/composables/useHoneypot.js'
import { getStripe, resetStripe } from 'src/payments/adapters/stripe'
import { useCartSummary } from 'src/composables/useCartSummary'
import {useSeoMeta} from "src/composables/useSeo.js";
import {getApiOrigin} from "src/utils/server/get-api-origin.js";
import { signedIn } from 'src/composables/useAccount.js'
import { ecommerceOf, eventItem, track } from 'src/utils/custom-code.js'
import { t as i18nT, useI18n } from 'src/i18n/index.js'

const { t } = useI18n()
const {
  displayCart, itemsCount, cartItems, cartTotal, cartTotalDiscount, couponApplied,
  shippingOptions, selectedShippingRateId, couponCode, couponError, loadingCoupon,
  fetchShippingRates, onShippingMethodChange, applyCoupon, removeCoupon
} = useCartSummary()

defineOptions({
  async preFetch ({ ssrContext, currentRoute }) {
    let cartData;
    if(ssrContext) {
      cartData = await cart.fetchCart(true, ssrContext)
    } else if(cart.needsSync()) {
      cartData = await cart.syncLocalCartWithServer()
    }
     //const seo = await fetchSeoForPath('checkout')
      const seo = {
        title: i18nT('Checkout'),
        description: 'Checkout page',
        robots: 'noindex, follow'
      }
    const isPreview = currentRoute.query.preview === 'true'

    const configData = await loadPageConfig('checkout', isPreview, getApiOrigin(ssrContext)) // The helper we'll create
    if (ssrContext) {

      ssrContext.cartArray = cartData
      ssrContext.seoData = seo
      ssrContext.pageConfig = configData
    } else {
      window.__PAGE_CONFIG__ = configData;
      window.__CART_ARRAY__ = cartData
      window.__SEO_DATA__ = seo

    }

  }
})

const userData = ref(null);

function onLogin(user) {
  userData.value  = user
  signedIn(user)
  isLoggedIn.value = true
}

const googleLoginEnabled = !!import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID

const isProcessingOrder = ref(false)
const { honeypotField, isLikelyBot } = useHoneypot()
const $q = useQuasar()
// Change the default error icon (e.g., to 'warning')
$q.iconSet.field.error = matError

const pageConfig = ref('');
useSeoMeta({ noindex: true })
if (process.env.SERVER) {
  const ssr = useSSRContext()
  pageConfig.value = ssr?.pageConfig || null
}
// The same config the server rendered with (sections in the slots).
if (process.env.CLIENT && window.__PAGE_CONFIG__ && Object.keys(window.__PAGE_CONFIG__).length) {
  pageConfig.value = window.__PAGE_CONFIG__
}

// Store builder → Checkout: the terms checkbox (once a terms or privacy page is
// published) and "Create an account" for guests.
const sections = computed(() => shopSections('checkout', pageConfig.value || null))
const legal = computed(() => pageConfig.value?.legal || {})
const termsRequired = computed(() => pageConfig.value?.require_terms !== false && !!(legal.value.terms || legal.value.privacy))
const allowSignup = computed(() => !!pageConfig.value && pageConfig.value.allow_signup !== false)
const agreeTerms = ref(false)
const createAccount = ref(false)

const syncError = ref(null);

const checkoutReady = computed(() => {
  return !!displayCart.value
})
const isLoggedIn = ref(false)
const router = useRouter();

// 2. FORM INITIALIZATION: Do it immediately based on the store
const form = reactive({
  first_name: cart.state.cart_array?.shipping_address?.first_name || '',
  last_name: cart.state.cart_array?.shipping_address?.last_name || '',
  email: cart.state.cart_array?.billing_address?.email || '',
  phone: cart.state.cart_array?.billing_address?.phone || '',
  shipping: {
    address_1: cart.state.cart_array?.shipping_address?.address_1 || '',
    city: cart.state.cart_array?.shipping_address?.city || '',
    postcode: cart.state.cart_array?.shipping_address?.postcode || '',
    country: 'IL',
  },
  billing: {
    address_1: cart.state.cart_array?.billing_address?.address_1 || '',
    city: cart.state.cart_array?.billing_address?.city || '',
    postcode: cart.state.cart_array?.billing_address?.postcode || '',
    country: 'IL',
  }
});

const differentBillingAddress = ref(false)
const paymentMethod = ref('cod');
const paymentController = ref(null)
const currentAdapter = computed(() => getAdapter(paymentMethod.value))
const asyncComponentCache = new Map()
function onCardReady(ctrl) {
  paymentController.value = ctrl
}
const paymentComponent = computed(() => {
  const adapter = currentAdapter.value
  if (!adapter?.component) return null

  if (!asyncComponentCache.has(adapter.id)) {
    // Raw: the blocks read it through a reactive object, which must not wrap a component.
    asyncComponentCache.set(adapter.id, markRaw(defineAsyncComponent(adapter.component)))
  }
  return asyncComponentCache.get(adapter.id)
})
const paymentMethods = computed(() => {
  const methods = displayCart.value?.payment_methods || []
  return methods
    .filter(method => getAdapter(method))
    .map(method => ({
      label: t(paymentConfig.value?.methods?.[method]?.title || getAdapter(method).label),
      value: method,
    }))
})
const paymentNote = computed(() => paymentConfig.value?.methods?.[paymentMethod.value]?.description || '')
// Keep a method this store offers selected.
watch(paymentMethods, (list) => {
  if (list.length && !list.some(m => m.value === paymentMethod.value)) paymentMethod.value = list[0].value
}, { immediate: true })
const initializeFormFromCart = async () => {
  const cartData = displayCart.value
  if (!cartData) return

  let saved = {}
  if(typeof window !== 'undefined') {
    const rawSaved = localStorage.getItem('checkout_form')
    if (rawSaved) {
      try {
        saved = JSON.parse(rawSaved)
      } catch (err) {
        console.error('error', err)
        saved = {}
      }
    }
  }

  const billing = cartData.billing_address || {}
  const shipping = cartData.shipping_address || {}

  form.first_name        = saved.first_name || shipping.first_name || ''
  form.last_name         = saved.last_name || shipping.last_name || ''
  form.email              = saved.email || billing.email || ''
  form.phone               = saved.phone || billing.phone || ''

  form.shipping.address_1 = saved.shipping?.address_1 || shipping.address_1 || ''
  form.shipping.city      = saved.shipping?.city || shipping.city || ''
  form.shipping.postcode  = saved.shipping?.postcode || shipping.postcode || ''
  form.shipping.country   = saved.shipping?.country || shipping.country || 'IL'

  form.billing.address_1  = saved.billing?.address_1 || billing.address_1 || ''
  form.billing.city       = saved.billing?.city || billing.city || ''
  form.billing.postcode   = saved.billing?.postcode || billing.postcode || ''
  form.billing.country    = saved.billing?.country || billing.country || 'IL'

  saveFormToLocalStorage() // keep the cache consistent with what's now shown
}

const shippingUpdateError = ref(false)
const updateShippingAddress = async (differentBilling=null) => {
  try {
    if (differentBilling === null) {
      differentBilling = differentBillingAddress.value
    }
    const response = await fetchWithToken('/wp-json/wc/store/v1/cart/update-customer', {
      method: 'POST',
      body: JSON.stringify({
        billing_address: {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          address_1: !differentBilling ? form.shipping.address_1 : form.billing.address_1,
          city: !differentBilling ? form.shipping.city : form.billing.city,
          postcode: !differentBilling ? form.shipping.postcode : form.billing.postcode,
          country: !differentBilling ? form.shipping.country : form.billing.country,
        },
        shipping_address: {
          first_name: form.first_name,
          last_name: form.last_name,
          address_1: form.shipping.address_1,
          city: form.shipping.city,
          postcode: form.shipping.postcode,
          country: form.shipping.country,
          phone: form.phone,
          email: form.email,
        }
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update shipping address');
    }
    // The new address can change the shipping rates, payment methods and total.
    cart.applyCheckoutCart(await response.json())
    shippingUpdateError.value = false
  } catch (error) {
    console.error('Error updating shipping address:', error.message);
    shippingUpdateError.value = true
    $q.notify({
      type: 'negative',
      message: t("We couldn't save your shipping address. Please check your connection and try again."),
      icon: matError
    })
  }
};

const saveFormToLocalStorage = () => {
  if(typeof window !== 'undefined') {
    localStorage.setItem('checkout_form', JSON.stringify({
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone,
      shipping: {...form.shipping},
      billing: {...form.billing}
    }))
  }
}

const handleInputBlur = () => {
  saveFormToLocalStorage()

  if (!cart.state.offline) {
    updateShippingAddress()
    fetchShippingRates()
  }
}
const handleCheckboxBlur = (newVal) => {
  saveFormToLocalStorage()

  if (!cart.state.offline) {
      updateShippingAddress(newVal)
      fetchShippingRates()
  }
}

const submitOrder = async (walletOverride = null) => {
  if (cart.isOffline()) {
    $q.notify({ type: 'warning', message: t("You're offline. Connect to the internet to place your order."), icon: matError, position: 'top', timeout: 6000 })
    if (walletOverride) walletOverride.complete('fail')
    return
  }
  // Bot trap — only for the manually-typed form path. Apple/Google
  // Pay submit via @wallet-payment without touching the visible
  // fields at all, so they can legitimately be near-instant and
  // must skip the time check.
  if (!walletOverride && isLikelyBot()) {
    $q.notify({
      type: 'negative',
      message: t('Something went wrong placing your order. Please try again.'),
      icon: matError
    })
    return
  }

  if (termsRequired.value && !agreeTerms.value) {
    $q.notify({ type: 'negative', message: t("Please tick the box to agree to the store's terms before placing your order."), icon: matError })
    walletOverride?.complete?.('fail')
    return
  }

  if (shippingUpdateError.value) {
    $q.notify({
      type: 'negative',
      message: t('Your shipping address failed to save. Please re-enter it before placing your order.'),
      icon: matError
    })
    return
  }
  const isWallet = walletOverride && typeof walletOverride === 'object' && 'paymentMethod' in walletOverride
  isProcessingOrder.value = true
  // The method chosen now. Read it once: placing the order replaces the cart with the order's
  // answer, which lists no payment methods, and the selection then falls back to the first one
  // (cash on delivery), so the thank-you page and the adapter got the wrong method.
  const method = paymentMethod.value
  // Methods that pay on another site (Grow): placing the order empties the cart, so keep a copy to
  // put back if the shopper doesn't finish paying there.
  const redirects = !isWallet && !!getAdapter(method)?.redirects
  let cartSnapshot = null

  if (!cart.state.synced) {
    await syncCart()
    if (syncError.value) {
      if (isWallet) walletOverride.complete('fail')
      isProcessingOrder.value = false
      return
    }
  }
  try {
    let paymentData
    if (isWallet) {
      paymentData = [
        { key: 'payment_method', value: 'stripe' },
        { key: 'wc-stripe-payment-method', value: walletOverride.paymentMethod.id },
        { key: 'wc-stripe-is-deferred-intent', value: true },
      ]
    } else {
      const adapter = getAdapter(method)
      try {
        paymentData = await adapter.getPaymentData({
          controller: paymentController.value,
          billing: {name: `${form.first_name} ${form.last_name}`, email: form.email, phone: form.phone},
        })
      } catch (err) {
        console.error('Payment error:', err.message)
        $q.notify({
          type: 'negative',
          message: t(err.message || 'Payment failed. Please check your payment details and try again.'),
          icon: matError
        })
        isProcessingOrder.value = false
        return
      }
    }

    const payload = {
      billing_address: {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        address_1: differentBillingAddress.value ? form.billing.address_1 : form.shipping.address_1,
        city: differentBillingAddress.value ? form.billing.city : form.shipping.city,
        postcode: differentBillingAddress.value ? form.billing.postcode : form.shipping.postcode,
        country: differentBillingAddress.value ? form.billing.country : form.shipping.country,
      },
      shipping_address: {
        first_name: form.first_name,
        last_name: form.last_name,
        address_1: form.shipping.address_1,
        city: form.shipping.city,
        postcode: form.shipping.postcode,
        country: form.shipping.country,
        phone: form.phone,
        email: form.email,
      },
      payment_method: method,
      payment_data: paymentData,
      // The store checks the agreement (only sent when it asks for one).
      extensions: termsRequired.value ? { qwoo: { terms: agreeTerms.value } } : {},
      billing_same_as_shipping: !differentBillingAddress.value,
      ...(allowSignup.value && isLoggedIn.value === false && createAccount.value ? { create_account: true } : {}),
    }

    if (redirects) cartSnapshot = cart.snapshotLocalCart()
    const response = await cart.placeOrder(payload)

    const adapter = getAdapter(method)
    let result = null
    if (adapter?.handlePaymentResult) {
      result = await adapter.handlePaymentResult(response, { controller: paymentController.value })
    }
    if (result?.redirect) {
      // To the payment page; the checkout form stays filled in for when they come back.
      rememberGrowPayment({ orderId: response.order_id, key: response.order_key, email: response.billing_address?.email || form.email, pm: method, items: cartSnapshot })
      window.location.assign(result.redirect)
      return
    }

    if (isWallet) walletOverride.complete('success')

    router.push({ name: 'thank-you', query: { orderId: response.order_id, billing_email: response.billing_address.email, order_key: response.order_key, pm: method } })
    await cart.fetchCart()
  } catch (err) {
    console.error('Checkout error:', err.message)
    // fetch() itself failed: the connection, not the order.
    const shown = err instanceof TypeError ? t('No connection to the store. Check your internet and try again.') : err.message
    // At the top: at the bottom the cookie notice covered it, so the order just seemed not to go through.
    $q.notify({
      type: 'negative',
      message: t(shown || "We couldn't place your order. Please try again."),
      icon: matError,
      position: 'top',
      timeout: 8000
    })
    if (isWallet) walletOverride.complete('fail')
    // The order may have gone through without the payment page opening: the cart comes back.
    if (cartSnapshot) cart.restoreLocalCart(cartSnapshot)
    isProcessingOrder.value = false
  }
  localStorage.removeItem('checkout_form')
}
const syncCart = async () => {
  syncError.value = null

  if (!needsSync.value) {
    return // ⬅️ DO NOTHING
  }

  try {
    await cart.syncLocalCartWithServer()
  } catch {
    syncError.value = t(cart.state.error || 'Failed to sync cart')
  }
}

const needsSync = computed(() => {
  // offline → never block
  if (cart.state.offline) return false
  if (cart.state.synced === false) return true

  // no server snapshot yet → need sync
// cart not hydrated yet → NOT a sync case
  if (!cart.state.cart_array || !Array.isArray(cart.state.cart_array.items)) {
    return false
  }
  const localItems = cart.state.local_cart.items || []
  const serverItems = cart.state.cart_array.items || []

  if (localItems.length !== serverItems.length) return true

  const serverSigs = new Set(
      serverItems.map(i => cart.signatureFor(i.id, i.variation))
  )

  for (const li of localItems) {
    if (li._removed) return true
    const sig = cart.signatureFor(li.id, li.variation)
    if (!serverSigs.has(sig)) return true
  }

  return false
})

// Watch displayCart instead of cart_array
watch(
  () => displayCart.value,
  (cartData) => {
    if (!cartData) return
    initializeFormFromCart()
    fetchShippingRates()
  },
  { immediate: true }
)

onMounted(async () => {
  // Preload Stripe only for stores that take cards.
  loadPaymentConfig().then(config => (config ? config.stripe : true) && getStripe().catch(() => {}))
  isLoggedIn.value = getWasLoggedIn()
  if (window.__CART_ARRAY__ && !cart.state.cart_array && !cart.state.offline) {
    cart.state.cart_array = window.__CART_ARRAY__
    cart.state.synced = true
    window.__CART_ARRAY__ = null

    // FIX: SSR gave us the server's cart, but the local cart (localStorage)
    // may have items the server doesn't know about yet — e.g. items added
    // while offline, or before the session was established.
    // Load local cart first, then let the sync diff decide what to do.
    await cart.loadLocalCart()
    if (cart.needsSync()) {
      await cart.syncLocalCartWithServer()
    }
  } else {
    await cart.loadLocalCart()
    if (cart.needsSync()) {
      await cart.syncLocalCartWithServer()
    }
    // Only fetch after sync is complete so we never show stale data

    if (!cart.state.cart_array) {
      await cart.fetchCart()
    }
  }
  if (window.__PAGE_CONFIG__ && Object.keys(window.__PAGE_CONFIG__).length) {
    pageConfig.value = window.__PAGE_CONFIG__
  }

  unsubscribeConfigUpdates = subscribeToLiveConfig('checkout', (data) => { pageConfig.value = data })

  // Back from Grow's payment page (its "cancel" address is this page): paid after all → the
  // thank-you page; otherwise the cart comes back (placing the order emptied it).
  const growBack = takeGrowPayment()
  if (growBack) {
    const status = await checkGrowPayment(growBack.orderId, growBack.key)
    if (status?.paid) {
      router.replace({ name: 'thank-you', query: { orderId: growBack.orderId, billing_email: growBack.email, order_key: growBack.key, pm: growBack.pm } })
      return
    }
    if (cart.restoreLocalCart(growBack.items)) {
      $q.notify({ type: 'info', message: t("Your payment wasn't completed, so your cart is back. You can try again or choose another way to pay."), position: 'top', timeout: 8000 })
    }
  }

  // The owner's trackers (Settings → Tracking & code).
  const items = cart.state.cart_array?.items || []
  if (items.length) {
    // The items' value (shipping isn't chosen yet); the purchase carries the order's total.
    track('begin_checkout', { ecommerce: ecommerceOf(items.map((item) => eventItem(item)), cart.state.cart_array.totals?.currency_code) })
  }
});
onBeforeRouteLeave(() => {
  resetStripe()
})
onUnmounted(() => unsubscribeConfigUpdates())

// The template's forms (the Customer Details block): every one must be valid before the order goes.
const forms = new Set()
function registerForm(form) {
  forms.add(form)
  return () => forms.delete(form)
}
const ready = computed(() => !!displayCart.value && itemsCount.value !== '0')
async function placeOrder() {
  for (const form of forms) {
    const valid = await form.validate(true)
    if (!valid) {
      // Quasar focuses the first field that needs fixing: bring it into view.
      requestAnimationFrame(() => {
        const el = document.activeElement
        if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }
  }
  return submitOrder()
}

// What the template's blocks show and do (src/components/blocks/shop/Checkout*Block.vue).
provide('checkoutPage', reactive({
  cart: markRaw(cart), ready, displayCart, itemsCount, cartItems, cartTotal, cartTotalDiscount, couponApplied,
  shippingOptions, selectedShippingRateId, couponCode, couponError, loadingCoupon,
  onShippingMethodChange, applyCoupon, removeCoupon,
  isLoggedIn, checkoutReady, onLogin, googleLoginEnabled,
  form, handleInputBlur, handleCheckboxBlur, differentBillingAddress,
  paymentMethod, paymentMethods, paymentNote, paymentComponent, onCardReady,
  termsRequired, allowSignup, agreeTerms, createAccount, legal,
  submitOrder, placeOrder, registerForm,
}))
</script>

<style>
/* Shared by the checkout blocks (not scoped: they're in child components). */
/* purgecss start ignore */
.checkout-page .q-field__label {
    transition: 0.3s ease;
}
.checkout-page .q-field--focused .q-field__label
.checkout-page .q-field--float .q-field__label{
  font-size: 10px;
  transform: translateY(-5px);
}
/* purgecss end ignore */
.checkout-empty { padding: 20px 0; }
.blockUi{
  position: absolute;
  height: 100%;
  width: 100%;
  background: #00000050;
  z-index: 999;
  left: 0;
  top: 0;
}
.blockUi:before {
    content: '';
    width: 30px;
    height: 30px;
    border: 5px solid #000;
    background: transparent;
    border-radius: 50%;
    display: block;
    border-top-color: #00000025;
    position: sticky;
    top: 100px;
    margin: 100px auto 0;
    animation: rotate 1s linear infinite;
}
@keyframes rotate {
  from{
    transform: rotate(0);
  }
  to {
    transform: rotate(360deg);
  }
}
.processing-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>