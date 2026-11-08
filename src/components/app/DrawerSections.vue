<template>
  <!-- A header widget's drawer built from blocks (Store builder → Menu / Mini Cart / Mini
       Wishlist → Drawer Content → Built from blocks): its title, then the owner's sections. -->
  <q-scroll-area :visible="false" class="fit drawer-sections" :class="`drawer-sections--${entry.kind}`">
    <div class="drawer-sections__head sticky flex justify-between items-center no-wrap" :style="entry.bg ? { background: entry.bg } : null">
      <div v-if="entry.title !== ''" class="text-h6">{{ entry.title ?? t(TITLES[entry.kind] || 'Menu') }}</div><span v-else />
      <q-btn flat dense padding="none" :aria-label="t(CLOSE[entry.kind] || 'Close')" :icon="matClose" @click="emit('close')" />
    </div>
    <SectionRenderer :sections="entry.sections" page="drawer" no-priority />
    <q-banner
        v-if="entry.kind === 'menu' && entry.showNotifications !== false && vapidConfigured && supported && permission !== 'granted' && permission !== 'denied'"
        class="bg-secondary text-white q-ma-md rounded-borders shadow-2"
        inline-actions
    >
      <div class="text-subtitle1">{{ t('Enable push notifications?') }}</div>
      <template #action>
        <q-btn style="line-height: 1;" outline padding="sm" color="secondary" text-color="white" :label="t('Enable')" @click="emit('subscribe')" />
      </template>
    </q-banner>
  </q-scroll-area>
</template>

<script setup>
import { provide } from 'vue'
import { matClose } from '@quasar/extras/material-icons'
import SectionRenderer from 'components/sections/SectionRenderer.vue'
import { provideCartPage } from 'src/composables/useCartPage.js'
import { pushKeyReady as vapidConfigured } from 'src/composables/useNotificationSoftAsk.js'
import { useI18n } from 'src/i18n/index.js'

const props = defineProps({
  // useDrawers.js entry: { kind, title, sections, showNotifications, … }.
  entry: { type: Object, required: true },
  supported: { type: Boolean, default: false },
  permission: { type: String, default: 'default' },
})
const emit = defineEmits(['close', 'subscribe'])
const { t } = useI18n()

const TITLES = { menu: 'Menu', cart: 'Cart', wishlist: 'Wishlist' }
const CLOSE = { menu: 'Close menu', cart: 'Close cart drawer', wishlist: 'Close wishlist drawer' }

// The cart blocks (items, totals) read the cart from here, like on the cart page.
if (props.entry.kind === 'cart') provideCartPage()
// Blocks inside can close the drawer (a "Close the drawer" button; links close it anyway).
provide('closeDrawer', () => emit('close'))
</script>

<style scoped>
.drawer-sections__head {
  position: sticky;
  top: 0;
  padding: 12px 16px;
  gap: 12px;
}
</style>
