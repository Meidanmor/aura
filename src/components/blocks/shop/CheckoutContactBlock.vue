<template>
  <template v-if="c">
    <q-form v-if="c.ready" ref="formEl" class="checkout-contact" @submit.prevent="c.placeOrder">
      <CheckoutPart :data="d" :default-title="t('Personal Details')">
        <SavedAddressPicker v-if="showPicker" />
        <q-input :for="fid('f1')" v-model="c.form.first_name" v-bind="look" :label="t('First Name *')" class="q-mb-sm" :rules="[val => !!val || t('First Name is required')]" @blur="c.handleInputBlur" />
        <q-input :for="fid('f2')" v-model="c.form.last_name" v-bind="look" :label="t('Last Name *')" class="q-mb-sm" :rules="[val => !!val || t('Last Name is required')]" @blur="c.handleInputBlur" />
        <q-input :for="fid('f3')"
            v-model="c.form.email"
            v-bind="look"
            :label="t('Email *')"
            class="q-mb-sm"
            type="text"
            :rules="[val => !!val || t('Email is required'), val => /^\S+@\S+\.\S+$/.test(val) || t('Please enter a valid email')]"
            @blur="c.handleInputBlur"
        />
        <q-input :for="fid('f4')" v-model="c.form.phone" v-bind="look" :label="t('Phone *')" :rules="[val => !!val || t('Phone is required')]" @blur="c.handleInputBlur" />
      </CheckoutPart>
    </q-form>

    <div v-else-if="c.displayCart && c.itemsCount === '0'" class="checkout-empty">
      {{ t('Your cart is empty!') }}
      <router-link to="/products/">{{ t('Go to shop') }}</router-link>
    </div>

    <div v-else class="centered">
      <q-spinner color="secondary" size="2em" />
      <div>{{ t('Synchronizing cart, please wait...') }}</div>
    </div>
  </template>
</template>

<script setup>
import { useFieldIds } from 'src/utils/field-id.js'
import { computed, inject, onUnmounted, ref, watch } from 'vue'
import CheckoutPart from './CheckoutPart.vue'
import SavedAddressPicker from 'src/components/checkout/SavedAddressPicker.vue'

const fid = useFieldIds()

/**
 * "Contact Details" (checkout page template): name, email and phone; until
 * there's something to pay for, "Your cart is empty" or the loader.
 * Its form is checked by the Place Order block (c.placeOrder).
 */
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
const pickerId = props.blockId || 'contact'
const showPicker = computed(() => !!c?.isLoggedIn && c.pickerAt === pickerId)
onUnmounted(() => { unregister(); releasePicker() })
</script>
