<template>
  <div v-if="c?.ready" class="checkout-note">
    <CheckoutPart :data="d" :default-title="t('Order Note')">
      <q-input
          :for="fid('f1')"
          v-model="c.orderNote"
          v-bind="look"
          type="textarea"
          autogrow
          maxlength="1000"
          :label="d.field_label || t('Notes about your order, e.g. delivery instructions')"
      />
    </CheckoutPart>
  </div>
</template>

<script setup>
import { useFieldIds } from 'src/utils/field-id.js'
import { computed, inject } from 'vue'
import CheckoutPart from './CheckoutPart.vue'

const fid = useFieldIds()

/** "Order Note" (checkout page template): the customer's note, sent with the order; the owner sees it on the order. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('checkoutPage', null)
const d = computed(() => props.data.data || {})
// Filled / outlined / underlined / plain fields (Quasar's own looks).
const LOOKS = new Set(['filled', 'outlined', 'standard', 'borderless'])
const look = computed(() => { const l = LOOKS.has(d.value.field_look) ? d.value.field_look : 'filled'; return l === 'standard' ? {} : { [l]: true } })
</script>
