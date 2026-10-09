<template>
    <div class="container q-pa-md">
      <div v-if="isProcessingOrder" class="processing-overlay">
        <q-spinner color="secondary" size="3em" />
        <div class="q-mt-md text-h6">{{ t('Processing your order…') }}</div>
      </div>
      <h1>{{ t('Checkout') }}</h1>
      <SectionRenderer :sections="pageConfig?.sections" page="checkout" location="before_checkout"/>
      <div v-if="isLoggedIn === false && checkoutReady && itemsCount !== '0'">
        <q-expansion-item
            :label="t('Have an account?')"
            header-class="text-bold cursor-pointer"
            class="q-mb-sm"
            :expand-icon="matKeyboardArrowDown"
            expand-separator
        >

          <div class="account-login-container q-mb-md">
            <LoginForm @login-success="onLogin" />
            <span class="flex q-mb-sm q-mt-sm text-h6" v-if="googleLoginEnabled">{{ t('OR') }}</span>
            <GoogleLoginButton @login-success="onLogin"/>
          </div>

        </q-expansion-item>
      </div>

      <q-form class="flex" v-if="displayCart && itemsCount !== '0'" @submit.prevent="submitOrder" @validation-error="onValidationError">
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

      <div class="float-left">
      <SectionRenderer :sections="pageConfig?.sections" page="checkout" location="before_customer_details"/>
      <!-- Personal Info -->
      <q-card class="q-mb-md">
        <q-card-section class="q-pa-md">
          <div class="text-h6">{{ t('Personal Details') }}</div>
          <q-input @blur="handleInputBlur" v-model="form.first_name" :label="t('First Name *')" filled class="q-mb-sm" :rules="[val => !!val || t('First Name is required')]"/>
          <q-input @blur="handleInputBlur" v-model="form.last_name" :label="t('Last Name *')" filled class="q-mb-sm" :rules="[val => !!val || t('Last Name is required')]"/>
          <q-input
              @blur="handleInputBlur" v-model="form.email"
              :label="t('Email *')" filled class="q-mb-sm"
              type="text"
              :rules="[
                  val => !!val || t('Email is required'),
    val => /^\S+@\S+\.\S+$/.test(val) || t('Please enter a valid email')
  ]"
          />
          <q-input @blur="handleInputBlur" v-model="form.phone" :label="t('Phone *')" filled :rules="[val => !!val || t('Phone is required')]"/>
        </q-card-section>
      </q-card>

      <!-- Shipping Address -->
      <q-card class="q-mb-md">
        <q-card-section class="q-pa-md">
          <div class="text-h6">{{ t('Shipping Address') }}</div>
          <q-input @blur="handleInputBlur" v-model="form.shipping.address_1" :label="t('Address *')" filled class="q-mb-sm" :rules="[val => !!val || t('Address is required')]"/>
          <q-input @blur="handleInputBlur" v-model="form.shipping.city" :label="t('City *')" filled class="q-mb-sm" :rules="[val => !!val || t('City is required')]"/>
          <q-input @blur="handleInputBlur" v-model="form.shipping.postcode" :label="t('Postcode')" filled class="q-mb-sm" :rules="[val => !!val || t('Postcode is required')]"/>
          <q-input readonly @blur="handleInputBlur" v-model="form.shipping.country" :label="t('Country')" filled />
        </q-card-section>

        <q-card-section>
          <q-checkbox @update:model-value="handleCheckboxBlur" v-model="differentBillingAddress" :label="t('Different billing address?')" color="secondary" />
        </q-card-section>
      </q-card>

      <!-- Billing Address (conditional) -->
      <q-card v-if="differentBillingAddress" class="q-mb-md">
        <q-card-section class="q-pa-md">
          <div class="text-h6">{{ t('Billing Address') }}</div>
          <q-input @blur="handleInputBlur" v-model="form.billing.address_1" :label="t('Billing Address *')" filled class="q-mb-sm" />
          <q-input @blur="handleInputBlur" v-model="form.billing.city" :label="t('City *')" filled class="q-mb-sm" />
          <q-input @blur="handleInputBlur" v-model="form.billing.postcode" :label="t('Postcode')" filled class="q-mb-sm" />
          <q-input @blur="handleInputBlur" v-model="form.billing.country" :label="t('Country')" filled />
        </q-card-section>
      </q-card>

      <!-- Coupon Section -->
      <q-card class="q-mb-md">
        <q-card-section class="q-pa-md">
          <div class="text-h6">{{ t('Coupon') }}</div>
          <div class="row items-center q-col-gutter-md">
            <div class="col">
              <q-input v-model="couponCode" :label="t('Coupon code')" filled @keydown.enter.stop.prevent="applyCoupon(couponCode)"/>
            </div>
            <div class="col-auto">
              <q-btn :label="t('Apply')" color="secondary" :loading="loadingCoupon" @click="applyCoupon(couponCode)" />
            </div>
          </div>
          <div v-if="couponApplied" class="text-positive q-mt-sm">
            {{ t('Coupon applied successfully!') }}
          </div>
          <div v-if="couponError" class="text-negative q-mt-sm">
            {{ couponError }}
          </div>
          <div v-if="cart.state?.cart_array?.coupons.length">
            <div v-for="coupon in cart.state.cart_array.coupons" :key="coupon.code" class="q-mb-sm row items-center">
              <q-chip color="secondary" text-color="white" class="q-mr-sm">
                {{ coupon.code }}
              </q-chip>
              <q-btn flat color="negative" :label="t('Remove')" @click="removeCoupon(coupon.code)" />
            </div>
          </div>
        </q-card-section>
      </q-card>
      <SectionRenderer :sections="pageConfig?.sections" page="checkout" location="after_customer_details"/>
      </div>
      <div class="float-right relative-position">
        <div class="blockUi" v-if="cart.state.loading.cart === true"></div>
        <SectionRenderer :sections="pageConfig?.sections" page="checkout" location="before_order_review"/>
      <!-- Cart Items -->
      <q-card class="q-mb-md">
        <q-card-section class="q-pa-md">
          <div class="text-h6">{{ t('Your Cart') }}</div>
          <div v-for="item in cartItems" :key="item.key" class="checkout-items q-my-sm flex items-center no-wrap">
            <div>
             <q-img
              v-if="item?.images?.length"
              :src="item.images[0].src"
              :alt="item.name"
              height="100px"
              width="100px"
              class="rounded-borders"
            />
            </div>
            <div class="flex">
            <div class="item-name">
              {{ item.name }}
             <div v-if="item.variation && item.variation.length > 0">
             <div
             v-for="(variation, index) in item.variation"
             :key="index"
             >
             {{variation.attribute}}: {{variation.value}}
             </div>
          </div>
         </div>
              × {{ item.quantity }} - {{formatCurrency(item.totals?.line_total ?? (parseInt(toRaw(item.prices)?.price || 0) * item.quantity).toString()) }}
            </div>
          </div>
        </q-card-section>
      </q-card>

    <!-- Shipping Method -->
    <q-card class="q-mb-md">
      <q-card-section class="q-pa-md">
        <div class="text-h6">{{ t('Choose Shipping Method') }}</div>
        <q-option-group
          v-model="selectedShippingRateId"
          :options="shippingOptions"
          type="radio"
          color="secondary"
          @update:model-value="onShippingMethodChange"
        />
      </q-card-section>
    </q-card>

      <!-- Payment -->
      <q-card class="q-mb-md">
        <q-card-section class="q-pa-md">
          <div class="text-h6">{{ t('Payment Method') }}</div>
          <q-option-group
            v-model="paymentMethod"
            :options="paymentMethods"
            type="radio"
            color="secondary"
          />
          <div v-if="paymentNote" class="text-caption text-grey-8 q-my-sm" style="white-space: pre-line">{{ paymentNote }}</div>
          <component
              :is="paymentComponent"
              v-if="paymentComponent"
              :amount="Number(displayCart.totals.total_price)"
              :currency="(displayCart.totals.currency_code || 'ILS').toLowerCase()"
              @ready="onCardReady"
              @wallet-payment="submitOrder"
          />

        </q-card-section>
      </q-card>

      <SectionRenderer :sections="pageConfig?.sections" page="checkout" location="before_place_order"/>
      <!-- Total & Place Order -->
      <q-card class="q-pa-md">
        <q-card-section>
          <div v-if="couponApplied">{{ t('Total discount: {amount}', { amount: formatCurrency(cartTotalDiscount) }) }}</div>
          <div class="text-h6">{{ t('Total:') }} <span v-if="couponApplied"><del>{{formatCurrency((Number(cartTotalDiscount)+Number(cartTotal)))}}</del></span> {{ formatCurrency(cartTotal) }}</div>
        </q-card-section>
        <q-card-section v-if="(allowSignup && isLoggedIn === false) || termsRequired" class="q-pt-none checkout-agree">
          <q-checkbox v-if="allowSignup && isLoggedIn === false" v-model="createAccount" color="secondary" :label="t('Create an account (we\'ll email you a link to set your password)')" />
          <q-checkbox v-if="termsRequired" v-model="agreeTerms" color="secondary">
            <span>
              {{ t('I have read and agree to the') }}
              <template v-if="legal.terms"><router-link :to="legal.terms" target="_blank" @click.stop>{{ t('terms and conditions') }}</router-link></template>
              <template v-if="legal.terms && legal.privacy"> {{ t('and the') }} </template>
              <template v-if="legal.privacy"><router-link :to="legal.privacy" target="_blank" @click.stop>{{ t('privacy policy') }}</router-link></template>
              {{ t('of this store. *') }}
            </span>
          </q-checkbox>
        </q-card-section>
        <q-card-actions>
          <q-btn :label="t('Place Order')" type="submit" color="secondary" />
        </q-card-actions>
      </q-card>
        </div>
    </q-form>

      <div v-else-if="displayCart && itemsCount === '0'">
        {{ t('Your cart is empty!') }}
        <router-link to="/products/">{{ t('Go to shop') }}</router-link>
      </div>

      <!-- Render loader and sync retry state -->
      <div v-else class="centered">
        <q-spinner color="secondary" size="2em" />
        <div>{{ t('Synchronizing cart, please wait...') }}</div>
      </div>

      <!-- Offline banner inside the form, at the top -->
      <div v-if="displayCart?._offline" class="bg-warning text-dark q-pa-sm q-mb-md rounded-borders">
        {{ t('You\'re offline. Your form data is being saved locally and your order will be submitted when you reconnect.') }}
      </div>

      <SectionRenderer :sections="pageConfig?.sections" page="checkout" location="after_checkout"/>
      <div v-if="syncError" class="text-negative q-mt-md text-center">
        {{ syncError }}
        <q-btn :label="t('Retry Sync')" color="secondary" @click="syncCart" class="q-ml-md" />
      </div>
    </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted, onUnmounted, useSSRContext, toRaw } from 'vue';
import cart from 'src/stores/cart';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import { useQuasar } from 'quasar';
import {fetchWithToken, setLoggedIn} from 'src/composables/useApiFetch.js';
import GoogleLoginButton from '../components/account/GoogleLoginButton.vue';
import SectionRenderer from 'components/sections/SectionRenderer.vue';
import { loadPageConfig, subscribeToLiveConfig } from 'src/utils/config-loader'

let unsubscribeConfigUpdates = () => {}
import {matError, matKeyboardArrowDown} from '@quasar/extras/material-icons'
import {formatCurrency} from 'src/utils/formatters.js'
import { getWasLoggedIn } from 'src/composables/useApiFetch.js'
import { defineAsyncComponent } from 'vue'
import { getAdapter } from 'src/payments/registry'
import { loadPaymentConfig, paymentConfig } from 'src/payments/config'
import { useHoneypot } from 'src/composables/useHoneypot.js'
import { getStripe, resetStripe } from 'src/payments/adapters/stripe'
import { useCartSummary } from 'src/composables/useCartSummary'
import {useSeoMeta} from "src/composables/useSeo.js";
import {getApiOrigin} from "src/utils/server/get-api-origin.js";
import LoginForm from 'src/components/account/LoginForm.vue'
import {setUser} from "stores/user.js";
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
  setUser(user)
  setLoggedIn(true)
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
    asyncComponentCache.set(adapter.id, defineAsyncComponent(adapter.component))
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
    await response.json();
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

const onValidationError = async(ref) => {
  const valid = await ref.validate()
  if (!valid) {
    // Wait a tick for Quasar to focus the first invalid field
    requestAnimationFrame(() => {
      const el = document.activeElement
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({behavior: 'smooth', block: 'center'})
      }
    })
    return
  }
}
const submitOrder = async (walletOverride = null) => {
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
      const adapter = getAdapter(paymentMethod.value)
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
      payment_method: paymentMethod.value,
      payment_data: paymentData,
      // The store checks the agreement (only sent when it asks for one).
      extensions: termsRequired.value ? { qwoo: { terms: agreeTerms.value } } : {},
      billing_same_as_shipping: !differentBillingAddress.value,
      ...(allowSignup.value && isLoggedIn.value === false && createAccount.value ? { create_account: true } : {}),
    }

    const response = await cart.placeOrder(payload)

    const adapter = getAdapter(paymentMethod.value)
    if (adapter?.handlePaymentResult) {
      await adapter.handlePaymentResult(response, { controller: paymentController.value })
    }

    if (isWallet) walletOverride.complete('success')

    router.push({ name: 'thank-you', query: { orderId: response.order_id, billing_email: response.billing_address.email, order_key: response.order_key, pm: paymentMethod.value } })
    await cart.fetchCart()
  } catch (err) {
    console.error('Checkout error:', err.message)
    $q.notify({
      type: 'negative',
      message: t(err.message || "We couldn't place your order. Please try again."),
      icon: matError
    })
    if (isWallet) walletOverride.complete('fail')
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
});
onBeforeRouteLeave(() => {
  resetStripe()
})
onUnmounted(() => unsubscribeConfigUpdates())
</script>

<style scoped>
/* purgecss start ignore */
.q-field__label {
    transition: 0.3s ease;
}
.q-field--focused .q-field__label
.q-field--float .q-field__label{
  font-size: 10px;
  transform: translateY(-5px);
}
/* purgecss end ignore */
.checkout-items {
  gap: 10px;
}
.q-form .float-left,
.q-form .float-right {
  width: 100%;
}
@media(min-width: 768px) {
  .q-form .float-left {
    width: 57%;
  }

  .q-form .float-right {
    width: 41%;
  }
}
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