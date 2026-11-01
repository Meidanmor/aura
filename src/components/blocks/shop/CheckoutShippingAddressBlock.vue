<template>
  <q-form v-if="c?.ready" ref="formEl" class="checkout-shipping-address" @submit.prevent="c.placeOrder">
    <CheckoutPart :data="d" :default-title="t('Shipping Address')">
      <SavedAddressPicker v-if="showPicker" />
      <q-input :for="fid('f1')" v-model="c.form.shipping.address_1" v-bind="look" :label="t('Address *')" class="q-mb-sm" :rules="[val => !!val || t('Address is required')]" @blur="c.handleInputBlur" />
      <q-input :for="fid('f2')" v-model="c.form.shipping.city" v-bind="look" :label="t('City *')" class="q-mb-sm" :rules="[val => !!val || t('City is required')]" @blur="c.handleInputBlur" />
      <q-input :for="fid('f3')" v-model="c.form.shipping.postcode" v-bind="look" :label="t('Postcode')" class="q-mb-sm" :rules="[val => !!val || t('Postcode is required')]" @blur="c.handleInputBlur" />
      <q-input :for="fid('f4')" v-model="c.form.shipping.country" v-bind="look" readonly :label="t('Country')" @blur="c.handleInputBlur" />
      <q-checkbox v-if="c.addressIsNew" v-model="c.saveNewAddress" class="q-mt-sm" :label="t('Save this address for next time')" />
    </CheckoutPart>
  </q-form>
</template>

<script setup>
import { useFieldIds } from 'src/utils/field-id.js'
import { computed, inject, onUnmounted, ref, watch } from 'vue'
import CheckoutPart from './CheckoutPart.vue'
import SavedAddressPicker from 'src/components/checkout/SavedAddressPicker.vue'

const fid = useFieldIds()

/** "Shipping Address" (checkout page template). Its form is checked by Place Order. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('checkoutPage', null)
const d = computed(() => props.data.data || {})
// Filled / outlined / underlined / plain fields (Quasar's own looks).
const LOOKS = new Set(['filled', 'outlined', 'standard', 'borderless'])
const look = computed(() => { const l = LOOKS.has(d.value.field_look) ? d.value.field_look : 'filled'; return l === 'standard' ? {} : { [l]: true } })
const formEl = ref(null)
let unregister = () => {}
let releasePicker = () => {}
watch(formEl, (el) => {
  unregister()
  releasePicker()
  unregister = el && c ? c.registerForm(el) : () => {}
  releasePicker = el && c?.claimPicker ? c.claimPicker(pickerId, el.$el) : () => {}
})
// "Use saved address" (signed-in customers), in the first address block on the page.
const pickerId = props.blockId || 'shipping'
const showPicker = computed(() => !!c?.isLoggedIn && c.pickerAt === pickerId)
onUnmounted(() => { unregister(); releasePicker() })
</script>
