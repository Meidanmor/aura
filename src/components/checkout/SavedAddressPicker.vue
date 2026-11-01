<template>
  <div v-if="saved.list.length" class="saved-picker">
    <q-btn
        outline no-caps dense
        class="saved-picker__btn"
        :icon="matPlace"
        :label="t('Use saved address')"
        aria-haspopup="listbox"
        @click="open"
    >
      <q-menu v-model="menuOpen" no-parent-event anchor="bottom start" self="top start" class="saved-picker__menu">
        <q-list role="listbox" :aria-label="t('Saved addresses')">
          <q-item v-for="a in saved.list" :key="a.id" v-close-popup clickable role="option" @click="choose(a)">
            <q-item-section>
              <q-item-label class="saved-picker__name">{{ addressName(a) }}<span v-if="a.label" class="saved-picker__label"> · {{ a.label }}</span></q-item-label>
              <q-item-label caption>{{ addressLine(a) }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>

    <q-dialog v-model="sheetOpen" position="bottom" class="saved-picker-dialog">
      <div class="saved-picker-sheet" role="listbox" :aria-label="t('Saved addresses')" data-sheet>
        <!-- Drag the handle or the title down to close. -->
        <div class="saved-picker-sheet__grip" aria-hidden="true" v-on="sheetDrag"><span /></div>
        <div class="saved-picker-sheet__title" v-on="sheetDrag">{{ t('Saved addresses') }}</div>
        <q-list class="saved-picker-sheet__list">
          <q-item v-for="a in saved.list" :key="a.id" v-close-popup clickable role="option" @click="choose(a)">
            <q-item-section>
              <q-item-label class="saved-picker__name">{{ addressName(a) }}<span v-if="a.label" class="saved-picker__label"> · {{ a.label }}</span></q-item-label>
              <q-item-label caption>{{ addressLine(a) }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-dialog>
  </div>
</template>

<script setup>
import { inject, onMounted, ref, watch } from 'vue'
import { matPlace } from '@quasar/extras/material-icons'
import { useSheetDrag } from 'src/composables/useSheetDrag.js'
import { useSavedAddresses, loadAddresses, addressName, addressLine } from 'src/composables/useSavedAddresses.js'
import { userState } from 'src/stores/user.js'
import { useI18n } from 'src/i18n/index.js'

/**
 * Checkout: a small "Use saved address" button for signed-in customers with
 * saved addresses. It opens the list (name + address only): a menu on
 * computers, a sheet from the bottom on phones. Choosing one fills the name,
 * phone and shipping address.
 */
const { t } = useI18n()
const c = inject('checkoutPage', null)
const saved = useSavedAddresses()

onMounted(() => loadAddresses())
watch(() => userState.data?.id, () => loadAddresses())

const menuOpen = ref(false)
const sheetOpen = ref(false)
const sheetDrag = useSheetDrag(() => { sheetOpen.value = false })
function open() {
  const phone = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  if (phone) sheetOpen.value = true
  else menuOpen.value = !menuOpen.value
}

function choose(a) {
  if (!c?.form) return
  c.form.first_name = a.first_name
  c.form.last_name = a.last_name
  if (a.phone) c.form.phone = a.phone
  c.form.shipping.address_1 = a.address_1
  c.form.shipping.city = a.city
  c.form.shipping.postcode = a.postcode
  if (a.country) c.form.shipping.country = a.country
  menuOpen.value = false
  sheetOpen.value = false
  // Saves the form and sends the address to the cart (shipping rates, totals).
  c.handleInputBlur()
}
</script>

<style>
.saved-picker { margin-bottom: 12px; }
.saved-picker__btn { padding: 4px 12px; }
.saved-picker__menu { min-width: 280px; max-width: min(420px, 92vw); }
.saved-picker__name { font-weight: 600; }
.saved-picker__label { font-weight: 400; opacity: .7; }
.saved-picker-dialog { z-index: 10000; }
.saved-picker-sheet { background: #fff; color: inherit; width: 100%; max-width: 100vw; max-height: 75vh; display: flex; flex-direction: column; border-radius: 16px 16px 0 0; padding: 8px 0 calc(8px + env(safe-area-inset-bottom)); }
.saved-picker-sheet__title { font-weight: 700; padding: 6px 16px 8px; touch-action: none; }
.saved-picker-sheet__grip { display: flex; justify-content: center; padding: 4px 0 6px; touch-action: none; cursor: grab; }
.saved-picker-sheet__grip span { width: 40px; height: 4px; border-radius: 4px; background: rgba(0, 0, 0, .2); }
.saved-picker-sheet__list { overflow-y: auto; }
</style>
