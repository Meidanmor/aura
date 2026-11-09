<template>
  <div v-if="c?.ready && c.pickupOffered" class="checkout-delivery-mode" :style="choiceVars">
    <CheckoutPart :data="d" :default-title="t('How would you like to get your order?')">
      <div class="co-mode" role="radiogroup" :aria-label="d.title || t('How would you like to get your order?')">
        <button
            v-for="m in modes"
            :key="m.value"
            type="button"
            role="radio"
            class="co-mode__option"
            :class="[optionText.class, { 'is-on': c.deliveryMode === m.value }]"
            :style="optionText.style"
            :aria-checked="c.deliveryMode === m.value ? 'true' : 'false'"
            @click="c.setDeliveryMode(m.value)"
        >
          <q-icon :name="m.icon" size="22px" />
          <span>{{ m.label }}</span>
        </button>
      </div>
    </CheckoutPart>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, onUnmounted } from 'vue'
import { matLocalShipping, matStorefront } from '@quasar/extras/material-icons'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import CheckoutPart from './CheckoutPart.vue'
import { t } from 'src/i18n/index.js'

/**
 * "Delivery or Pickup" (checkout page template): two choices. Pickup lists the store's local
 * pickup methods in the Delivery Options and hides the address blocks; Delivery lists the
 * others. Shown only when the store offers both (and something in the cart ships).
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('checkoutPage', null)
const d = computed(() => props.data.data || {})
const modes = computed(() => [
  { value: 'delivery', label: d.value.delivery_label || t('Delivery'), icon: matLocalShipping },
  { value: 'pickup', label: d.value.pickup_label || t('Pickup'), icon: matStorefront },
])
const choice = computed(() => resolveGlobalColor(d.value.choice_color))
const choiceVars = computed(() => (choice.value ? { '--co-choice': choice.value } : {}))
const optionText = computed(() => textStyle(d.value, tsKeys('option')))
let release = () => {}
onMounted(() => { if (c?.registerModeBlock) release = c.registerModeBlock() })
onUnmounted(() => release())
</script>

<style scoped>
.co-mode { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.co-mode__option {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 52px; padding: 10px 12px;
  border: 1px solid rgba(127, 127, 127, .35); border-radius: 8px;
  background: transparent; color: inherit; font: inherit; cursor: pointer;
}
.co-mode__option.is-on { border-color: var(--co-choice, var(--q-secondary)); box-shadow: inset 0 0 0 1px var(--co-choice, var(--q-secondary)); }
.co-mode__option.is-on .q-icon { color: var(--co-choice, var(--q-secondary)); }
.co-mode__option:focus-visible { outline: 2px solid var(--co-choice, var(--q-secondary)); outline-offset: 2px; }
</style>
