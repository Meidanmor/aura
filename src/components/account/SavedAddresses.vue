<template>
  <div class="saved-addresses">
    <h3 class="saved-addresses__title">{{ t('Saved addresses') }}</h3>
    <p class="saved-addresses__hint">{{ t('Pick one of these at checkout instead of typing it again.') }}</p>

    <div v-if="loading" class="q-my-sm"><q-spinner color="secondary" size="1.5em" /></div>
    <template v-else>
      <div v-if="!list.length && !editing" class="saved-addresses__empty">{{ t('No saved addresses yet.') }}</div>

      <div v-for="a in list" :key="a.id">
        <div v-if="editing?.id !== a.id" class="saved-address">
          <div class="saved-address__body">
            <div v-if="a.label" class="saved-address__label">{{ a.label }}</div>
            <div class="saved-address__name">{{ addressName(a) }}</div>
            <div>{{ addressLine(a) }}</div>
            <div v-if="a.phone" class="saved-address__phone">{{ a.phone }}</div>
          </div>
          <div class="saved-address__actions">
            <q-btn flat dense no-caps :label="t('Edit')" @click="edit(a)" />
            <q-btn flat dense no-caps :label="t('Delete')" :loading="removing === a.id" @click="remove(a)" />
          </div>
        </div>
        <AddressForm v-else :model="editing" :look="look" :saving="saving" :error="error" @save="save" @cancel="cancel" />
      </div>

      <AddressForm v-if="editing && !editing.id" :model="editing" :look="look" :saving="saving" :error="error" @save="save" @cancel="cancel" />

      <q-btn
          v-if="!editing && list.length < 10"
          outline no-caps
          class="q-mt-sm"
          :label="t('Add an address')"
          @click="add"
      />
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import AddressForm from './AddressForm.vue'
import { useSavedAddresses, loadAddresses, saveAddress, deleteAddress, addressName, addressLine } from 'src/composables/useSavedAddresses.js'
import { userState } from 'src/stores/user.js'
import { useI18n } from 'src/i18n/index.js'

/** My account → Account details: the customer's saved addresses (add, edit, delete). */
const props = defineProps({
  user: { type: Object, required: true },
  look: { type: Object, default: () => ({ filled: true }) },
})
const { t } = useI18n()
const $q = useQuasar()
const saved = useSavedAddresses()

// The Store builder's preview: one sample address, nothing loaded or saved.
const SAMPLE = [{ id: 'ad_sample', label: 'Home', first_name: 'Dana', last_name: 'Levi', phone: '050-0000000', address_1: 'Herzl 1', city: 'Tel Aviv', postcode: '6100000', country: 'IL' }]
const list = computed(() => (props.user?.sample ? SAMPLE : saved.list))
const loading = computed(() => !props.user?.sample && !saved.loaded && saved.loading)

const editing = ref(null)
const saving = ref(false)
const removing = ref('')
const error = ref('')

onMounted(() => { if (!props.user?.sample) loadAddresses() })
watch(() => userState.data?.id, () => { if (!props.user?.sample) loadAddresses() })

function blank() {
  return { label: '', first_name: props.user?.first_name || '', last_name: props.user?.last_name || '', phone: '', address_1: '', city: '', postcode: '', country: list.value[0]?.country || 'IL' }
}
function add() { error.value = ''; editing.value = blank() }
function edit(a) { error.value = ''; editing.value = { ...a } }
function cancel() { editing.value = null; error.value = '' }

async function save(address) {
  if (props.user?.sample) { editing.value = null; return }
  saving.value = true
  error.value = ''
  try {
    await saveAddress(address)
    editing.value = null
  } catch (e) {
    error.value = t(e.message)
  } finally {
    saving.value = false
  }
}

function remove(a) {
  if (props.user?.sample) return
  $q.dialog({
    message: t('Delete this address?'),
    cancel: { label: t('Cancel'), flat: true, noCaps: true },
    ok: { label: t('Delete'), flat: true, noCaps: true, color: 'negative' },
  }).onOk(async () => {
    removing.value = a.id
    try {
      await deleteAddress(a.id)
    } catch (e) {
      $q.notify({ type: 'negative', message: t(e.message) })
    } finally {
      removing.value = ''
    }
  })
}
</script>

<style>
.saved-addresses { margin-top: 28px; }
.saved-addresses__title { margin: 0 0 4px; font-size: 1.15rem; line-height: 1.3; }
.saved-addresses__hint { margin: 0 0 12px; opacity: .75; }
.saved-addresses__empty { margin: 8px 0; opacity: .75; }
.saved-address { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 12px 14px; margin-bottom: 8px; border: 1px solid #00000022; border-radius: 4px; }
.saved-address__label { font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; opacity: .7; }
.saved-address__name { font-weight: 600; }
.saved-address__phone { opacity: .75; }
.saved-address__actions { display: flex; gap: 4px; flex-shrink: 0; }
</style>
