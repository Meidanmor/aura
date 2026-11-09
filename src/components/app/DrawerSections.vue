<template>
  <!-- A header widget's drawer built from blocks (Store builder → Menu / Mini Cart / Mini
       Wishlist → Drawer Content → Built from blocks): its title, then the owner's sections. -->
  <!-- Sections with "Keep at the bottom of the drawer" sit under the scrolling part. -->
  <div class="fit column no-wrap drawer-sections" :class="`drawer-sections--${entry.kind}`">
  <q-scroll-area :visible="false" class="col drawer-sections__scroll">
    <div class="drawer-sections__head sticky flex justify-between items-center no-wrap" :style="entry.bg ? { background: entry.bg } : null">
      <div v-if="entry.title !== ''" class="text-h6">{{ entry.title ?? t(TITLES[entry.kind] || 'Menu') }}</div><span v-else />
      <q-btn flat dense padding="none" :aria-label="t(CLOSE[entry.kind] || 'Close')" :icon="matClose" @click="emit('close')" />
    </div>
    <SectionRenderer :sections="scrolling" page="drawer" no-priority />
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
  <div v-if="pinned.length" class="drawer-sections__bottom" :style="entry.bg ? { background: entry.bg } : null">
    <SectionRenderer :sections="pinned" page="drawer" no-priority />
  </div>
  </div>
</template>

<script setup>
import { computed, provide } from 'vue'
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

// "Keep at the bottom of the drawer" (a section's Advanced → Position).
const pinned = computed(() => (props.entry.sections || []).filter((s) => s?.style?.drawer_pin))
const scrolling = computed(() => (props.entry.sections || []).filter((s) => !s?.style?.drawer_pin))

const TITLES = { menu: 'Menu', cart: 'Cart', wishlist: 'Wishlist' }
const CLOSE = { menu: 'Close menu', cart: 'Close cart drawer', wishlist: 'Close wishlist drawer' }

// The cart blocks (items, totals) read the cart from here, like on the cart page.
if (props.entry.kind === 'cart') provideCartPage()
// Blocks inside can close the drawer (a "Close the drawer" button; links close it anyway).
provide('closeDrawer', () => emit('close'))
</script>

<style scoped>
.drawer-sections__scroll {
  min-height: 0;
}
.drawer-sections__bottom {
  flex: none;
  max-height: 70%;
  overflow-y: auto;
}
.drawer-sections__head {
  position: sticky;
  top: 0;
  padding: 12px 16px;
  gap: 12px;
}
</style>
