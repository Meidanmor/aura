<template>
  <div v-if="c?.ready" class="checkout-coupon">
    <CheckoutPart :data="d" :default-title="t('Coupon')">
      <div class="row items-center q-col-gutter-md">
        <div class="col">
          <q-input v-model="c.couponCode" v-bind="look" :label="t('Coupon code')" @keydown.enter.stop.prevent="c.applyCoupon(c.couponCode)" />
        </div>
        <div class="col-auto">
          <q-btn :label="d.button_label || t('Apply')" :color="buttonBg ? undefined : 'secondary'" :style="buttonColors" :loading="c.loadingCoupon" @click="c.applyCoupon(c.couponCode)" />
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
    </CheckoutPart>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import CheckoutPart from './CheckoutPart.vue'

/** "Coupon Box" (checkout page template): enter a code, the codes in use. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('checkoutPage', null)
const d = computed(() => props.data.data || {})
// Filled / outlined / underlined / plain fields (Quasar's own looks).
const LOOKS = new Set(['filled', 'outlined', 'standard', 'borderless'])
const look = computed(() => { const l = LOOKS.has(d.value.field_look) ? d.value.field_look : 'filled'; return l === 'standard' ? {} : { [l]: true } })
const buttonBg = computed(() => resolveGlobalColor(d.value.button_bg))
const buttonColors = computed(() => ({ ...(buttonBg.value ? { background: buttonBg.value } : {}), ...(d.value.button_text ? { color: resolveGlobalColor(d.value.button_text) } : {}) }))
</script>
