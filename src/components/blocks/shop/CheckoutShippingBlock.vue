<template>
  <div v-if="c?.ready && c.needsShipping" class="checkout-shipping" :style="choiceVars">
    <CheckoutPart :data="d" :default-title="t('Choose Shipping Method')">
      <q-option-group
          v-model="c.selectedShippingRateId"
          :options="c.deliveryOptions"
          type="radio"
          :color="choice ? undefined : 'secondary'"
          :class="[optionText.class, { 'co-choice': choice }]"
          :style="optionText.style"
          @update:model-value="c.onShippingMethodChange"
      />
      <p v-if="pickupAddress" class="co-pickup"><b>{{ t('Pickup address') }}:</b> <span>{{ pickupAddress }}</span></p>
      <!-- "Pickup point (HFD)": a point in the shopper's city, required before paying. Drawn after this block mounts. -->
      <PickupPointSelect v-if="mounted && c.pointNeeded" v-model="c.pickupPoint" :city="c.form?.shipping?.city || ''" />
    </CheckoutPart>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, inject, onMounted, ref } from 'vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import CheckoutPart from './CheckoutPart.vue'

const PickupPointSelect = defineAsyncComponent(() => import('src/components/checkout/PickupPointSelect.vue'))
const mounted = ref(false)
onMounted(() => { mounted.value = true })

/** "Delivery Options" (checkout page template): the shipping choice. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('checkoutPage', null)
const d = computed(() => props.data.data || {})
const choice = computed(() => resolveGlobalColor(d.value.choice_color))
const choiceVars = computed(() => (choice.value ? { '--co-choice': choice.value } : {}))
const optionText = computed(() => textStyle(d.value, tsKeys('option')))
const pickupAddress = computed(() => (c?.deliveryOptions || []).find((o) => o.value === c?.selectedShippingRateId)?.address || '')
</script>

<style scoped>
.co-pickup { margin: 8px 0 0; white-space: pre-line; }
.co-choice :deep(.q-radio__inner--truthy) { color: var(--co-choice); }
</style>
