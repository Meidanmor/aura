<template>
  <q-form v-if="c?.ready" ref="formEl" class="checkout-billing-address" @submit.prevent="c.placeOrder">
    <CheckoutPart :data="{ ...d, show_title: c.differentBillingAddress && d.show_title !== false }" :default-title="t('Billing Address')">
      <q-checkbox v-model="c.differentBillingAddress" :label="d.checkbox_label || t('Different billing address?')" color="secondary" :class="{ 'q-mb-sm': c.differentBillingAddress }" @update:model-value="c.handleCheckboxBlur" />
      <template v-if="c.differentBillingAddress">
        <q-input v-model="c.form.billing.address_1" v-bind="look" :label="t('Billing Address *')" class="q-mb-sm" @blur="c.handleInputBlur" />
        <q-input v-model="c.form.billing.city" v-bind="look" :label="t('City *')" class="q-mb-sm" @blur="c.handleInputBlur" />
        <q-input v-model="c.form.billing.postcode" v-bind="look" :label="t('Postcode')" class="q-mb-sm" @blur="c.handleInputBlur" />
        <q-input v-model="c.form.billing.country" v-bind="look" :label="t('Country')" @blur="c.handleInputBlur" />
      </template>
    </CheckoutPart>
  </q-form>
</template>

<script setup>
import { computed, inject, onUnmounted, ref, watch } from 'vue'
import CheckoutPart from './CheckoutPart.vue'

/** "Billing Address" (checkout page template): "Different billing address?", then its fields. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('checkoutPage', null)
const d = computed(() => props.data.data || {})
// Filled / outlined / underlined / plain fields (Quasar's own looks).
const LOOKS = new Set(['filled', 'outlined', 'standard', 'borderless'])
const look = computed(() => { const l = LOOKS.has(d.value.field_look) ? d.value.field_look : 'filled'; return l === 'standard' ? {} : { [l]: true } })
const formEl = ref(null)
let unregister = () => {}
watch(formEl, (el) => {
  unregister()
  unregister = el && c ? c.registerForm(el) : () => {}
})
onUnmounted(() => unregister())
</script>
