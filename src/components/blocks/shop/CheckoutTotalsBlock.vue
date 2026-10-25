<template>
  <div v-if="c?.ready" class="checkout-totals">
    <CheckoutPart :data="d" :default-title="t('Order Summary')">
      <div v-if="c.couponApplied && d.show_discount !== false">{{ t('Total discount: {amount}', { amount: formatCurrency(c.cartTotalDiscount) }) }}</div>
      <div class="text-h6" :class="totalText.class" :style="totalText.style">
        {{ t('Total:') }} <span v-if="c.couponApplied && d.show_discount !== false"><del>{{ formatCurrency(Number(c.cartTotalDiscount) + Number(c.cartTotal)) }}</del></span> {{ formatCurrency(c.cartTotal) }}
      </div>
    </CheckoutPart>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { formatCurrency } from 'src/utils/formatters.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import CheckoutPart from './CheckoutPart.vue'

/** "Order Totals" (checkout page template): the discount and the total to pay. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('checkoutPage', null)
const d = computed(() => props.data.data || {})
const totalText = computed(() => textStyle(d.value, tsKeys('total'), 'headings'))
</script>
