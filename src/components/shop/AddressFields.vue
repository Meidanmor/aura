<template>
  <q-input autocomplete="address-line1" aria-required="true" :for="fid('f1')"
      v-model="model.address_1"
      :label="required ? `${addressLabel} *` : addressLabel"
      filled
      class="q-mb-sm"
      :rules="required ? [val => !!val || `${addressLabel} is required`] : []"
  />
  <q-input autocomplete="address-level2" aria-required="true" :for="fid('f2')"
      v-model="model.city"
      :label="required ? t('City *') : t('City')"
      filled
      class="q-mb-sm"
      :rules="required ? [val => !!val || t('City is required')] : []"
  />
  <q-input autocomplete="postal-code" aria-required="true" :for="fid('f3')"
      v-model="model.postcode"
      :label="required ? t('Postcode *') : t('Postcode')"
      filled
      class="q-mb-sm"
      :rules="required ? [val => !!val || t('Postcode is required')] : []"
  />
  <q-input autocomplete="country-name" :for="fid('f4')" v-model="model.country" :label="t('Country')" filled />
</template>

<script setup>
import { useFieldIds } from 'src/utils/field-id.js'

const fid = useFieldIds()
// Shared address block used for both shipping and billing.
// `modelValue` is expected to be a reactive sub-object (e.g. form.shipping or form.billing)
// so mutations here flow straight back into the parent's reactive form state.
defineProps({
  addressLabel: {
    type: String,
    default: 'Address'
  },
  required: {
    type: Boolean,
    default: true
  }
})

const model = defineModel({
  type: Object,
  required: true
})
</script>