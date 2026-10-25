<template>
  <q-form v-if="c?.ready" ref="formEl" class="checkout-shipping-address" @submit.prevent="c.placeOrder">
    <CheckoutPart :data="d" :default-title="t('Shipping Address')">
      <q-input v-model="c.form.shipping.address_1" v-bind="look" :label="t('Address *')" class="q-mb-sm" :rules="[val => !!val || t('Address is required')]" @blur="c.handleInputBlur" />
      <q-input v-model="c.form.shipping.city" v-bind="look" :label="t('City *')" class="q-mb-sm" :rules="[val => !!val || t('City is required')]" @blur="c.handleInputBlur" />
      <q-input v-model="c.form.shipping.postcode" v-bind="look" :label="t('Postcode')" class="q-mb-sm" :rules="[val => !!val || t('Postcode is required')]" @blur="c.handleInputBlur" />
      <q-input v-model="c.form.shipping.country" v-bind="look" readonly :label="t('Country')" @blur="c.handleInputBlur" />
    </CheckoutPart>
  </q-form>
</template>

<script setup>
import { computed, inject, onUnmounted, ref, watch } from 'vue'
import CheckoutPart from './CheckoutPart.vue'

/** "Shipping Address" (checkout page template). Its form is checked by Place Order. */
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
