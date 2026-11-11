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

      <!-- Settings → Checkout: no header and footer, and the checkout in steps (blocks of other
           steps hidden by their data-block-id). A style element, so the server's page has it too. -->
      <component :is="'style'" v-if="pageCss">{{ pageCss }}</component>
      <CheckoutStepsBlock v-if="stepsOn && !hasStepsBlock" :data="{ data: {} }" class="checkout-steps--auto" />

      <SectionRenderer :sections="sections" page="checkout" />

      <div v-if="syncError" class="text-negative q-my-md text-center">
        {{ syncError }}
        <q-btn :label="t('Retry Sync')" color="secondary" @click="syncCart" class="q-ml-md" />
      </div>

      <!-- Cardcom's card form inside the checkout (the owner's choice in Settings → Payments) -->
      <q-dialog :model-value="!!payFrame" persistent :maximized="$q.screen.lt.sm" @escape-key="closePayFrame">
        <div v-if="payFrame" class="pay-frame">
          <div class="pay-frame__head">
            <b>{{ t('Secure payment') }}</b>
            <q-btn flat round dense :icon="matClose" :aria-label="t('Close')" :loading="payFrameClosing" @click="closePayFrame" />
          </div>
          <iframe :src="payFrame.url" class="pay-frame__body" :title="t('Secure payment')" allow="payment" referrerpolicy="no-referrer-when-downgrade" />
        </div>
      </q-dialog>
    </div>
</template>

<script setup>
import { currentSource } from 'src/utils/traffic-source.js'
import { ref, computed, reactive, watch, onMounted, onUnmounted, useSSRContext, provide, markRaw, nextTick } from 'vue';
import cart from 'src/stores/cart';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import { useQuasar } from 'quasar';
import {fetchWithToken} from 'src/composables/useApiFetch.js';
import SectionRenderer from 'components/sections/SectionRenderer.vue';
import CheckoutStepsBlock from 'components/blocks/shop/CheckoutStepsBlock.vue';
import { useRoute } from 'vue-router';
import { loadPageConfig, subscribeToLiveConfig } from 'src/utils/config-loader'

let unsubscribeConfigUpdates = () => {}
import { matError, matClose } from '@quasar/extras/material-icons'
import { shopSections } from 'src/utils/shop-templates.js'
import { getWasLoggedIn } from 'src/composables/useApiFetch.js'
import { defineAsyncComponent } from 'vue'
import { getAdapter } from 'src/payments/registry'
import { rememberGrowPayment, takeGrowPayment, checkGrowPayment } from 'src/payments/grow-return'
import { loadPaymentConfig, paymentConfig } from 'src/payments/config'
import { useHoneypot } from 'src/composables/useHoneypot.js'
import { getStripe, resetStripe } from 'src/payments/adapters/stripe'
import { useCartSummary } from 'src/composables/useCartSummary'
import { usePreviewCart } from 'src/utils/sample-cart.js'
import {useSeoMeta} from "src/composables/useSeo.js";
import {getApiOrigin} from "src/utils/server/get-api-origin.js";
import { signedIn } from 'src/composables/useAccount.js'
import { isSaved, saveAddress as keepAddress } from 'src/composables/useSavedAddresses.js'
import { ecommerceOf, eventItem, track } from 'src/utils/custom-code.js'
import { t as i18nT, useI18n } from 'src/i18n/index.js'

const { t } = useI18n()
// The Store builder's preview of an empty cart shows a sample one (never ordered).
const preview = usePreviewCart(cart)
const {
  displayCart, itemsCount, cartItems, cartTotal, cartTotalDiscount, couponApplied,
  shippingOptions, pickupRateIds, selectedShippingRateId, couponCode, couponError, loadingCoupon,
  fetchShippingRates, onShippingMethodChange, applyCoupon, removeCoupon
} = useCartSummary(() => preview.cart.value)

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
// "Send me offers": only when the owner offers it, and never ticked in advance.
const marketingOptin = computed(() => pageConfig.value?.marketing_optin || {})
const wantsMarketing = ref(false)
const allowSignup = computed(() => !!pageConfig.value && pageConfig.value.allow_signup !== false)
const agreeTerms = ref(false)
const createAccount = ref(false)
// The Order Note block: the customer's note, sent with the order (WooCommerce's customer note).
const orderNote = ref('')

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
  // The sample cart: the methods this store offers.
  const methods = preview.previewing.value ? (Object.keys(paymentConfig.value?.methods || {}).length ? Object.keys(paymentConfig.value.methods) : ['cod']) : displayCart.value?.payment_methods || []
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

  // No payment method on: say so (else the order went out as "cod" and the store
  // answered "Cash on delivery is not available for this order").
  if (!paymentMethods.value.length) {
    $q.notify({ type: 'negative', message: t("This store can't take payments yet, so orders can't be placed. Please contact the store."), icon: matError, position: 'top', timeout: 8000 })
    walletOverride?.complete?.('fail')
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

    // Pickup or nothing that ships: the address blocks are hidden, so no address goes with the order.
    const noAddress = !addressNeeded.value
    const billingFrom = noAddress ? { address_1: '', city: '', postcode: '', country: form.shipping.country || 'IL' } : differentBillingAddress.value ? form.billing : form.shipping
    const payload = {
      billing_address: {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        address_1: billingFrom.address_1,
        city: billingFrom.city,
        postcode: billingFrom.postcode,
        country: billingFrom.country,
      },
      shipping_address: {
        first_name: form.first_name,
        last_name: form.last_name,
        address_1: noAddress ? '' : form.shipping.address_1,
        city: noAddress ? '' : form.shipping.city,
        postcode: noAddress ? '' : form.shipping.postcode,
        country: form.shipping.country,
        phone: form.phone,
        email: form.email,
      },
      payment_method: method,
      payment_data: paymentData,
      // The store checks the agreement (only sent when it asks for one).
      extensions: { qwoo: { ...(termsRequired.value ? { terms: agreeTerms.value } : {}), ...currentSource(), ...(marketingOptin.value.on && wantsMarketing.value ? { marketing: true } : {}) } },
      billing_same_as_shipping: noAddress || !differentBillingAddress.value,
      ...(orderNote.value.trim() ? { customer_note: orderNote.value.trim().slice(0, 1000) } : {}),
      ...(allowSignup.value && isLoggedIn.value === false && createAccount.value ? { create_account: true } : {}),
    }

    if (redirects) cartSnapshot = cart.snapshotLocalCart()
    const response = await cart.placeOrder(payload)
    await rememberAddress()

    const adapter = getAdapter(method)
    let result = null
    if (adapter?.handlePaymentResult) {
      result = await adapter.handlePaymentResult(response, { controller: paymentController.value })
    }
    if (result?.frame) {
      // Cardcom's card form in a window over the checkout. When it's done, it moves this whole
      // page on (/__pay-return): to the thank-you page, or back here to try again.
      rememberGrowPayment({ orderId: response.order_id, key: response.order_key, email: response.billing_address?.email || form.email, pm: method, items: cartSnapshot })
      payFrame.value = { url: result.frame, orderId: response.order_id, key: response.order_key, email: response.billing_address?.email || form.email, pm: method }
      isProcessingOrder.value = false
      return
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
    const status = await checkGrowPayment(growBack.orderId, growBack.key, growBack.pm)
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
// The payment window (Cardcom inside the checkout): { url, orderId, key, email, pm } while open.
const payFrame = ref(null)
const payFrameClosing = ref(false)
/** Closing the window without paying: paid after all → thank-you; otherwise the cart comes back. */
async function closePayFrame() {
  const p = payFrame.value
  if (!p || payFrameClosing.value) return
  payFrameClosing.value = true
  try {
    const status = await checkGrowPayment(p.orderId, p.key, p.pm)
    const back = takeGrowPayment()
    payFrame.value = null
    if (status?.paid) {
      router.replace({ name: 'thank-you', query: { orderId: p.orderId, billing_email: p.email, order_key: p.key, pm: p.pm } })
      return
    }
    if (back && cart.restoreLocalCart(back.items)) {
      $q.notify({ type: 'info', message: t("Your payment wasn't completed, so your cart is back. You can try again or choose another way to pay."), position: 'top', timeout: 8000 })
    }
  } finally {
    payFrameClosing.value = false
  }
}

async function placeOrder() {
  if (stepsOn.value && !lastStep.value) return nextStep()
  for (const form of forms) {
    const step = stepsOn.value ? stepOfElement(form.$el) : null
    if (step !== null && step !== currentStep.value) {
      if (await form.validate(false)) continue
      currentStep.value = step
      await nextTick()
    }
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
// The preview's sample cart is never ordered.
// Saved addresses (signed-in customers): "Use saved address" is drawn once, by the
// highest address block on the page (blocks load in any order); a new address is
// saved after the order when "Save this address" stays ticked.
const pickerSpots = reactive(new Map())
const pickerAt = computed(() => {
  let best = ''
  let bestEl = null
  for (const [id, el] of pickerSpots) {
    if (!bestEl || (el.compareDocumentPosition(bestEl) & Node.DOCUMENT_POSITION_FOLLOWING)) { best = id; bestEl = el }
  }
  return best
})
function claimPicker(id, el) {
  if (!el) return () => {}
  pickerSpots.set(id, markRaw(el))
  return () => { if (pickerSpots.get(id) === el) pickerSpots.delete(id) }
}
const saveNewAddress = ref(true)
const typedAddress = () => ({
  first_name: form.first_name, last_name: form.last_name, phone: form.phone,
  address_1: form.shipping.address_1, city: form.shipping.city, postcode: form.shipping.postcode, country: form.shipping.country,
})
const addressIsNew = computed(() => isLoggedIn.value && !!form.shipping.address_1 && !isSaved(typedAddress()))
async function rememberAddress() {
  if (!addressIsNew.value || !saveNewAddress.value) return
  try {
    // Never holds the order up for long (a payment page may be next).
    await Promise.race([keepAddress(typedAddress()), new Promise((r) => setTimeout(r, 2500))])
  } catch (err) {
    console.warn('Address not saved:', err.message)
  }
}

/* ---------- Delivery or pickup, and carts with nothing to ship ---------- */

// false: nothing in the cart ships (gift cards, digital products): no address, no delivery options.
const needsShipping = computed(() => displayCart.value?.needs_shipping !== false)
const isPickupRate = (id) => pickupRateIds.value.includes(id)
// The "Delivery or Pickup" blocks on the page (they register while shown).
const modeBlocks = ref(0)
function registerModeBlock() {
  modeBlocks.value++
  return () => { modeBlocks.value-- }
}
// Both kinds offered: the block shows, and the Delivery Options list only the chosen kind.
const pickupOffered = computed(() => needsShipping.value && pickupRateIds.value.length > 0 && shippingOptions.value.some((o) => !isPickupRate(o.value)))
const deliveryMode = ref('delivery')
watch(() => isPickupRate(selectedShippingRateId.value), (pickup) => {
  if (selectedShippingRateId.value) deliveryMode.value = pickup ? 'pickup' : 'delivery'
}, { immediate: true })
const modeOn = computed(() => modeBlocks.value > 0 && pickupOffered.value)
const deliveryOptions = computed(() => (modeOn.value
  ? shippingOptions.value.filter((o) => isPickupRate(o.value) === (deliveryMode.value === 'pickup'))
  : shippingOptions.value))
function setDeliveryMode(mode) {
  deliveryMode.value = mode === 'pickup' ? 'pickup' : 'delivery'
  if (deliveryOptions.value.some((o) => o.value === selectedShippingRateId.value)) return
  const first = deliveryOptions.value[0]
  if (first) {
    selectedShippingRateId.value = first.value
    onShippingMethodChange(first.value)
  }
}
// The address is needed only when something is delivered (not picked up).
const addressNeeded = computed(() => needsShipping.value && !isPickupRate(selectedShippingRateId.value) && !(modeOn.value && deliveryMode.value === 'pickup'))

/* ---------- Checkout in steps (Settings → Checkout) ---------- */

const route = useRoute()
const stepsOn = computed(() => !!pageConfig.value?.steps)
// Each block's step ("auto" by its kind; the title, items, totals and summaries in every step).
const AUTO_STEP = {
  checkout_login: 1, checkout_contact: 1, checkout_delivery_mode: 1, checkout_shipping_address: 1, checkout_note: 1,
  checkout_shipping: 2,
  checkout_billing_address: 3, checkout_coupon: 3, checkout_payment: 3,
}
const blockStep = (b) => {
  const s = String(b?.data?.step ?? 'auto')
  if (s === 'all') return 'all'
  if (s === '1' || s === '2' || s === '3') return Number(s)
  return AUTO_STEP[b?.type] || 'all'
}
// Blocks that hide themselves for this cart don't make a step of their own.
const blockHidden = (type) => {
  if (!needsShipping.value && ['checkout_shipping', 'checkout_delivery_mode', 'checkout_shipping_address'].includes(type)) return true
  if (!addressNeeded.value && ['checkout_shipping_address', 'checkout_billing_address'].includes(type)) return true
  if (type === 'checkout_delivery_mode' && !pickupOffered.value) return true
  return false
}
// Steps as containers (2026-11-11): the Checkout Steps block holds one inner section per step,
// with that step's blocks; blocks outside it show on every step. A checkout published before
// that has no such sections: each block's own `step` (blockStep) is used, as before.
const stepsHolder = computed(() => {
  let found = null
  const walk = (list) => {
    for (const b of Array.isArray(list) ? list : []) {
      if (found || !b || b.enabled === false) continue
      if (b.type === 'checkout_steps' && Array.isArray(b.blocks) && b.blocks.some((s) => s && s.enabled !== false && s.type === 'section')) found = b
      else if (Array.isArray(b.blocks)) walk(b.blocks)
    }
  }
  walk(sections.value)
  return found
})
const heldSteps = computed(() => (stepsHolder.value?.blocks || []).filter((s) => s && s.enabled !== false && s.type === 'section'))
const stepsHeld = computed(() => heldSteps.value.length > 0)
const stepTitle = (n) => String(heldSteps.value[n - 1]?.label || '').trim() || [t('Details'), t('Delivery'), t('Payment')][n - 1] || t('Step {n}', { n })
const stepBlocks = computed(() => {
  const out = []
  const holder = stepsHolder.value
  const walk = (list, step) => {
    for (const b of Array.isArray(list) ? list : []) {
      if (!b || b.enabled === false) continue
      if (holder && b === holder) {
        out.push({ id: b.id, type: b.type, step: 'all' })
        heldSteps.value.forEach((s, i) => walk(s.blocks, i + 1))
        continue
      }
      if (b.type && b.type !== 'section') out.push({ id: b.id, type: b.type, step: step ?? (holder ? 'all' : blockStep(b)) })
      if (Array.isArray(b.blocks)) walk(b.blocks, step)
    }
  }
  walk(sections.value)
  return out
})
const hasStepsBlock = computed(() => stepBlocks.value.some((b) => b.type === 'checkout_steps'))
// The steps this checkout has (1 Details, 2 Delivery, 3 Payment), without empty ones.
const stepList = computed(() => {
  const used = new Set(stepBlocks.value.filter((b) => b.step !== 'all' && !blockHidden(b.type)).map((b) => b.step))
  const all = stepsHeld.value ? heldSteps.value.map((s, i) => i + 1) : [1, 2, 3]
  const list = all.filter((n) => used.has(n))
  return list.length ? list : [1]
})
const stepIndex = ref(0)
const currentStep = computed({
  get: () => stepList.value[Math.min(stepIndex.value, stepList.value.length - 1)],
  set: (n) => { const i = stepList.value.indexOf(n); if (i >= 0) stepIndex.value = i },
})
const lastStep = computed(() => !stepsOn.value || stepIndex.value >= stepList.value.length - 1)
const stepOfElement = (el) => {
  const id = el?.closest?.('[data-block-id]')?.dataset.blockId
  const b = id && stepBlocks.value.find((x) => x.id === id)
  return b && b.step !== 'all' ? b.step : null
}
function scrollToCheckoutTop() {
  if (typeof window === 'undefined') return
  const el = document.querySelector('.checkout-page')
  if (el) window.scrollTo({ top: Math.max(0, window.scrollY + el.getBoundingClientRect().top - 80), behavior: 'smooth' })
}
async function goStep(i) {
  if (i < 0 || i >= stepList.value.length) return
  stepIndex.value = i
  await nextTick()
  scrollToCheckoutTop()
}
// "Continue": this step's forms (the ones shown) must be right first.
async function nextStep() {
  for (const form of forms) {
    const el = form.$el
    if (!el || el.offsetParent === null) continue
    if (!(await form.validate(true))) {
      requestAnimationFrame(() => document.activeElement?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }))
      return
    }
  }
  const choosesDelivery = stepBlocks.value.some((b) => b.type === 'checkout_shipping' && b.step === currentStep.value)
  if (choosesDelivery && needsShipping.value && deliveryOptions.value.length && !selectedShippingRateId.value) {
    $q.notify({ type: 'negative', message: t('Please choose how to get your order.'), icon: matError })
    return
  }
  return goStep(stepIndex.value + 1)
}
// The Store builder preview: any step can be opened from the bar.
const inPreview = computed(() => route.query.preview === 'true')

const pageCss = computed(() => {
  let css = ''
  if (pageConfig.value?.hide_chrome) {
    css += '.q-layout > .announcement-bar, .q-layout > .above-header, .q-layout > .q-header, .q-layout > footer { display: none !important; }'
  }
  // (Steps as containers hide the other steps themselves: CheckoutStepsBlock.)
  if (stepsOn.value && !stepsHeld.value) {
    const now = currentStep.value
    const hide = stepBlocks.value.filter((b) => b.step !== 'all' && b.step !== now).map((b) => `[data-block-id="${String(b.id).replace(/[^\w-]/g, '')}"]`)
    if (hide.length) css += hide.join(', ') + ' { display: none !important; }'
  }
  return css
})

// The preview's sample cart is never ordered, but Continue still moves through the steps.
const previewPlaceOrder = () => (preview.previewing.value ? (lastStep.value ? undefined : goStep(stepIndex.value + 1)) : placeOrder())
const previewSubmitOrder = (...args) => (preview.previewing.value ? undefined : submitOrder(...args))
provide('checkoutPage', reactive({
  cart: preview.cart, ready, displayCart, itemsCount, cartItems, cartTotal, cartTotalDiscount, couponApplied,
  shippingOptions, selectedShippingRateId, couponCode, couponError, loadingCoupon,
  onShippingMethodChange, applyCoupon, removeCoupon,
  isLoggedIn, checkoutReady, onLogin, googleLoginEnabled,
  form, handleInputBlur, handleCheckboxBlur, differentBillingAddress,
  paymentMethod, paymentMethods, paymentNote, paymentComponent, onCardReady,
  termsRequired, allowSignup, agreeTerms, createAccount, legal, marketingOptin, wantsMarketing, orderNote,
  submitOrder: previewSubmitOrder, placeOrder: previewPlaceOrder, registerForm,
  pickerAt, claimPicker, saveNewAddress, addressIsNew,
  needsShipping, addressNeeded, pickupOffered, deliveryMode, deliveryOptions, setDeliveryMode, registerModeBlock,
  stepsOn, stepList, stepIndex, currentStep, stepTitle, lastStep, goStep, nextStep, inPreview,
}))
</script>

<style>
/* Cardcom's card form in a window over the checkout. */
.pay-frame { display: flex; flex-direction: column; width: min(560px, 100vw); height: min(760px, 92vh); background: #fff; color: #111; border-radius: 12px; overflow: hidden; }
.q-dialog__inner--maximized .pay-frame { width: 100vw; height: 100%; border-radius: 0; }
.pay-frame__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 8px 8px 16px; border-bottom: 1px solid rgba(0, 0, 0, .1); }
.pay-frame__body { flex: 1; width: 100%; border: 0; }
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