<template>
  <div v-if="shown" class="checkout-coupon">
    <CheckoutPart :data="d" :default-title="t('Coupon')">
      <button v-if="d.folded && !opened && !codes.length" type="button" class="checkout-coupon__open" @click="opened = true">{{ d.folded_text || t('Have a coupon?') }}</button>
      <template v-else>
        <div class="row items-center q-col-gutter-sm">
          <div class="col">
            <q-input :for="fid('f1')" v-model="c.couponCode" v-bind="look" :dense="!onCheckout" :label="t('Coupon code')" @keydown.enter.stop.prevent="c.applyCoupon(c.couponCode)" />
          </div>
          <div class="col-auto">
            <q-btn :label="d.button_label || t('Apply')" :color="buttonBg ? undefined : 'secondary'" :style="buttonColors" :loading="c.loadingCoupon" @click="c.applyCoupon(c.couponCode)" />
          </div>
        </div>
        <div v-if="c.couponApplied" class="text-positive q-mt-sm">{{ t('Coupon applied successfully!') }}</div>
        <div v-if="c.couponError" class="text-negative q-mt-sm">{{ c.couponError }}</div>
        <GiftCardsApplied mode="chips" />
        <div v-for="coupon in codes" :key="coupon.code" class="q-mt-xs row items-center">
          <q-chip color="secondary" text-color="white" class="q-mr-sm">{{ coupon.code }}</q-chip>
          <q-btn flat dense no-caps color="negative" :label="t('Remove')" @click="c.removeCoupon(coupon.code)" />
        </div>
      </template>
    </CheckoutPart>
  </div>
</template>

<script setup>
import { useFieldIds } from 'src/utils/field-id.js'
import { computed, inject, onMounted, ref } from 'vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import CheckoutPart from './CheckoutPart.vue'
import GiftCardsApplied from 'src/components/shop/GiftCardsApplied.vue'
import { t } from 'src/i18n/index.js'

const fid = useFieldIds()

/**
 * "Coupon Box": enter a code, the codes in use. On the checkout page, the cart
 * page and in the cart drawer (older "Cart Coupon" blocks draw with it too).
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const checkout = inject('checkoutPage', null)
const cartPage = inject('cartPage', null)
const onCheckout = !!checkout
const c = checkout || cartPage
const d = computed(() => props.data.data || {})
// The cart is known in the browser only: shown after this block mounts (not the page's isHydrated).
const mounted = ref(false)
onMounted(() => { mounted.value = true })
const shown = computed(() => {
  if (!c) return false
  if (onCheckout) return !!c.ready
  return mounted.value && !c.cart?.state?.offline && !!c.cart?.hasItems?.value
})
const codes = computed(() => (onCheckout ? c?.cart?.state?.cart_array?.coupons : c?.displayCart?.coupons) || [])
const opened = ref(false)
// Filled / outlined / underlined / plain fields (Quasar's own looks).
const LOOKS = new Set(['filled', 'outlined', 'standard', 'borderless'])
const look = computed(() => { const l = LOOKS.has(d.value.field_look) ? d.value.field_look : 'filled'; return l === 'standard' ? {} : { [l]: true } })
const buttonBg = computed(() => resolveGlobalColor(d.value.button_bg))
const buttonColors = computed(() => ({ ...(buttonBg.value ? { background: buttonBg.value } : {}), ...(d.value.button_text ? { color: resolveGlobalColor(d.value.button_text) } : {}) }))
</script>

<style scoped>
.checkout-coupon__open {
  background: none;
  border: 0;
  padding: 0;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}
</style>
