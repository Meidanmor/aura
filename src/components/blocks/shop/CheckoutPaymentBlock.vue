<template>
  <div v-if="c?.ready" class="checkout-payment" :style="choiceVars">
    <CheckoutPart :data="d" :default-title="t('Payment Method')">
      <q-option-group
          v-model="c.paymentMethod"
          :options="c.paymentMethods"
          type="radio"
          :color="choice ? undefined : 'secondary'"
          :class="[optionText.class, { 'co-choice': choice }]"
          :style="optionText.style"
      />
      <div v-if="c.paymentNote" class="text-caption text-grey-8 q-my-sm" style="white-space: pre-line">{{ c.paymentNote }}</div>
      <component
          :is="c.paymentComponent"
          v-if="c.paymentComponent"
          :amount="Number(c.displayCart.totals.total_price)"
          :currency="(c.displayCart.totals.currency_code || 'ILS').toLowerCase()"
          @ready="c.onCardReady"
          @wallet-payment="c.submitOrder"
      />
    </CheckoutPart>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import CheckoutPart from './CheckoutPart.vue'

/** "Payment Options" (checkout page template): how to pay, and the card form of the chosen provider. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('checkoutPage', null)
const d = computed(() => props.data.data || {})
const choice = computed(() => resolveGlobalColor(d.value.choice_color))
const choiceVars = computed(() => (choice.value ? { '--co-choice': choice.value } : {}))
const optionText = computed(() => textStyle(d.value, tsKeys('option')))
</script>

<style scoped>
.co-choice :deep(.q-radio__inner--truthy) { color: var(--co-choice); }
</style>
