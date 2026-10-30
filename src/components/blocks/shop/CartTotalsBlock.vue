<template>
  <q-card v-if="c && !c.cart.state.offline && c.cart.hasItems.value && ready" flat bordered class="q-pa-md relative-position cart-totals">
    <div v-if="c.cart.state.loading.cart" class="blockUi"></div>
    <template v-if="d.show_coupon !== false">
      <div class="text-subtitle1">{{ t('Coupon') }}</div>
      <div class="row items-center q-col-gutter-sm q-mb-sm">
        <div class="col"><q-input :for="fid('f1')" v-model="c.couponCode" :label="t('Coupon code')" dense filled @keydown.enter.stop.prevent="c.applyCoupon(c.couponCode)" /></div>
        <div class="col-auto"><q-btn :label="t('Apply')" color="secondary" :loading="c.loadingCoupon" @click="c.applyCoupon(c.couponCode)" /></div>
      </div>
      <div v-if="c.couponError" class="text-negative">{{ c.couponError }}</div>
      <div v-if="c.couponApplied" class="text-positive q-mt-sm">{{ t('Coupon applied successfully!') }}</div>
      <div v-if="c.couponApplied">
        <div v-for="coupon in c.displayCart.coupons" :key="coupon.code" class="row items-center q-mb-sm">
          <q-chip color="secondary" text-color="white">{{ coupon.code }}</q-chip>
          <q-btn flat color="negative" :label="t('Remove')" @click="c.removeCoupon(coupon.code)" />
        </div>
      </div>
    </template>
    <template v-if="d.show_shipping !== false">
      <div class="text-subtitle1 q-mt-md">{{ t('Shipping') }}</div>
      <q-option-group
          v-if="c.shippingOptions.length"
          v-model="c.selectedShippingRateId"
          :options="c.shippingOptions"
          type="radio"
          color="secondary"
          @update:model-value="c.onShippingMethodChange"
      />
      <div v-else class="text-caption">{{ t('Enter your address at checkout to see shipping options') }}</div>
    </template>
    <div class="q-mt-md">
      <div v-if="c.couponApplied">{{ t('Total discount: {amount}', { amount: formatCurrency(c.cartTotalDiscount) }) }}</div>
      <div class="text-h6">{{ t('Total: {amount}', { amount: formatCurrency(c.cartTotal) }) }}</div>
    </div>
    <router-link to="/checkout/">
      <q-btn :color="buttonBg ? undefined : 'secondary'" :style="buttonColors" :label="d.button_label || t('Checkout')" />
    </router-link>
  </q-card>
</template>

<script setup>
import { useFieldIds } from 'src/utils/field-id.js'
import { computed, inject, onMounted, ref } from 'vue'
import { formatCurrency } from 'src/utils/formatters.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'

// Shown after this block mounts (not the page's isHydrated: the block hydrates after the page).
const ready = ref(false)
onMounted(() => { ready.value = true })

const fid = useFieldIds()

/** "Cart Totals" (cart page template): coupon, shipping choice, total and the Checkout button. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('cartPage', null)
const d = computed(() => props.data.data || {})
const buttonBg = computed(() => resolveGlobalColor(d.value.button_bg))
const buttonColors = computed(() => ({ ...(buttonBg.value ? { background: buttonBg.value } : {}), ...(d.value.button_text ? { color: resolveGlobalColor(d.value.button_text) } : {}) }))
</script>
