<template>
  <template v-if="c">
    <q-form v-if="c.ready" ref="formEl" class="checkout-details" @submit.prevent="c.placeOrder">
      <!-- Personal Info -->
      <q-card class="q-mb-md">
        <q-card-section class="q-pa-md">
          <div class="text-h6">{{ t('Personal Details') }}</div>
          <q-input v-model="c.form.first_name" :label="t('First Name *')" filled class="q-mb-sm" :rules="[val => !!val || t('First Name is required')]" @blur="c.handleInputBlur" />
          <q-input v-model="c.form.last_name" :label="t('Last Name *')" filled class="q-mb-sm" :rules="[val => !!val || t('Last Name is required')]" @blur="c.handleInputBlur" />
          <q-input
              v-model="c.form.email"
              :label="t('Email *')"
              filled
              class="q-mb-sm"
              type="text"
              :rules="[val => !!val || t('Email is required'), val => /^\S+@\S+\.\S+$/.test(val) || t('Please enter a valid email')]"
              @blur="c.handleInputBlur"
          />
          <q-input v-model="c.form.phone" :label="t('Phone *')" filled :rules="[val => !!val || t('Phone is required')]" @blur="c.handleInputBlur" />
        </q-card-section>
      </q-card>

      <!-- Shipping Address -->
      <q-card class="q-mb-md">
        <q-card-section class="q-pa-md">
          <div class="text-h6">{{ t('Shipping Address') }}</div>
          <q-input v-model="c.form.shipping.address_1" :label="t('Address *')" filled class="q-mb-sm" :rules="[val => !!val || t('Address is required')]" @blur="c.handleInputBlur" />
          <q-input v-model="c.form.shipping.city" :label="t('City *')" filled class="q-mb-sm" :rules="[val => !!val || t('City is required')]" @blur="c.handleInputBlur" />
          <q-input v-model="c.form.shipping.postcode" :label="t('Postcode')" filled class="q-mb-sm" :rules="[val => !!val || t('Postcode is required')]" @blur="c.handleInputBlur" />
          <q-input v-model="c.form.shipping.country" readonly :label="t('Country')" filled @blur="c.handleInputBlur" />
        </q-card-section>
        <q-card-section>
          <q-checkbox v-model="c.differentBillingAddress" :label="t('Different billing address?')" color="secondary" @update:model-value="c.handleCheckboxBlur" />
        </q-card-section>
      </q-card>

      <!-- Billing Address (conditional) -->
      <q-card v-if="c.differentBillingAddress" class="q-mb-md">
        <q-card-section class="q-pa-md">
          <div class="text-h6">{{ t('Billing Address') }}</div>
          <q-input v-model="c.form.billing.address_1" :label="t('Billing Address *')" filled class="q-mb-sm" @blur="c.handleInputBlur" />
          <q-input v-model="c.form.billing.city" :label="t('City *')" filled class="q-mb-sm" @blur="c.handleInputBlur" />
          <q-input v-model="c.form.billing.postcode" :label="t('Postcode')" filled class="q-mb-sm" @blur="c.handleInputBlur" />
          <q-input v-model="c.form.billing.country" :label="t('Country')" filled @blur="c.handleInputBlur" />
        </q-card-section>
      </q-card>

      <!-- Coupon Section -->
      <q-card v-if="d.show_coupon !== false" class="q-mb-md">
        <q-card-section class="q-pa-md">
          <div class="text-h6">{{ t('Coupon') }}</div>
          <div class="row items-center q-col-gutter-md">
            <div class="col">
              <q-input v-model="c.couponCode" :label="t('Coupon code')" filled @keydown.enter.stop.prevent="c.applyCoupon(c.couponCode)" />
            </div>
            <div class="col-auto">
              <q-btn :label="t('Apply')" color="secondary" :loading="c.loadingCoupon" @click="c.applyCoupon(c.couponCode)" />
            </div>
          </div>
          <div v-if="c.couponApplied" class="text-positive q-mt-sm">{{ t('Coupon applied successfully!') }}</div>
          <div v-if="c.couponError" class="text-negative q-mt-sm">{{ c.couponError }}</div>
          <div v-if="c.cart.state?.cart_array?.coupons?.length">
            <div v-for="coupon in c.cart.state.cart_array.coupons" :key="coupon.code" class="q-mb-sm row items-center">
              <q-chip color="secondary" text-color="white" class="q-mr-sm">{{ coupon.code }}</q-chip>
              <q-btn flat color="negative" :label="t('Remove')" @click="c.removeCoupon(coupon.code)" />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-form>

    <div v-else-if="c.displayCart && c.itemsCount === '0'" class="checkout-empty">
      {{ t('Your cart is empty!') }}
      <router-link to="/products/">{{ t('Go to shop') }}</router-link>
    </div>

    <div v-else class="centered">
      <q-spinner color="secondary" size="2em" />
      <div>{{ t('Synchronizing cart, please wait...') }}</div>
    </div>
  </template>
</template>

<script setup>
import { computed, inject, onUnmounted, ref, watch } from 'vue'

/**
 * "Customer Details" (checkout page template): name, contact, addresses and
 * the coupon box; "Your cart is empty" or the loader until the cart is there.
 * Its form is checked by the Place Order block (c.placeOrder).
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('checkoutPage', null)
const d = computed(() => props.data.data || {})
const formEl = ref(null)
let unregister = () => {}
watch(formEl, (el) => {
  unregister()
  unregister = el && c ? c.registerForm(el) : () => {}
})
onUnmounted(() => unregister())
</script>
