<template>
  <q-form class="address-form" @submit.prevent="$emit('save', { ...form })">
    <q-input :for="fid('l')" v-model="form.label" v-bind="look" :label="t('Name for this address (Home, Work…)')" maxlength="40" :disable="saving" />
    <div class="address-form__row">
      <q-input :for="fid('f')" v-model="form.first_name" v-bind="look" :label="t('First Name *')" :rules="[req]" :disable="saving" />
      <q-input :for="fid('n')" v-model="form.last_name" v-bind="look" :label="t('Last Name *')" :rules="[req]" :disable="saving" />
    </div>
    <q-input :for="fid('p')" v-model="form.phone" v-bind="look" :label="t('Phone *')" :rules="[req]" :disable="saving" />
    <q-input :for="fid('a')" v-model="form.address_1" v-bind="look" :label="t('Address *')" :rules="[req]" :disable="saving" />
    <div class="address-form__row">
      <q-input :for="fid('c')" v-model="form.city" v-bind="look" :label="t('City *')" :rules="[req]" :disable="saving" />
      <q-input :for="fid('z')" v-model="form.postcode" v-bind="look" :label="t('Postcode')" :disable="saving" />
    </div>
    <div v-if="error" class="text-negative q-mb-sm">{{ error }}</div>
    <div class="address-form__buttons">
      <q-btn type="submit" color="secondary" unelevated no-caps :label="t('Save address')" :loading="saving" />
      <q-btn flat no-caps :label="t('Cancel')" :disable="saving" @click="$emit('cancel')" />
    </div>
  </q-form>
</template>

<script setup>
import { reactive } from 'vue'
import { useFieldIds } from 'src/utils/field-id.js'
import { useI18n } from 'src/i18n/index.js'

/** One saved address, being added or changed (My account): its own copy, handed back on save. */
const props = defineProps({
  model: { type: Object, required: true },
  look: { type: Object, default: () => ({ filled: true }) },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
defineEmits(['save', 'cancel'])
const { t } = useI18n()
const fid = useFieldIds()
const form = reactive({ ...props.model })
const req = (v) => !!String(v || '').trim() || t('Required')
</script>

<style>
.address-form { display: grid; gap: 4px; padding: 14px; margin-bottom: 8px; border: 1px solid #00000022; border-radius: 4px; }
.address-form__row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
@media (max-width: 599px) { .address-form__row { grid-template-columns: 1fr; gap: 4px; } }
.address-form__buttons { display: flex; gap: 8px; }
</style>
