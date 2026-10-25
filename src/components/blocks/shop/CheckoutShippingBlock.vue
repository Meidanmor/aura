<template>
  <div v-if="c?.ready" class="checkout-shipping" :style="choiceVars">
    <CheckoutPart :data="d" :default-title="t('Choose Shipping Method')">
      <q-option-group
          v-model="c.selectedShippingRateId"
          :options="c.shippingOptions"
          type="radio"
          :color="choice ? undefined : 'secondary'"
          :class="[optionText.class, { 'co-choice': choice }]"
          :style="optionText.style"
          @update:model-value="c.onShippingMethodChange"
      />
    </CheckoutPart>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import CheckoutPart from './CheckoutPart.vue'

/** "Delivery Options" (checkout page template): the shipping choice. */
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
