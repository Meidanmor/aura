<template>
  <q-scroll-area class="fit">
    <div class="q-pa-md">
      <div class="mobile-drawer-header flex justify-between q-mb-md">
        <div class="text-h6">{{ t('Menu') }}</div>
        <q-btn flat dense :aria-label="t('Close menu')" padding="none" :icon="matClose" @click="closeMenu"/>
      </div>
      <!-- The owner's menu (Design → Menus). -->
      <q-list v-if="Array.isArray(menu)" bordered padding>
        <MobileNavItems :items="menu" @navigate="closeMenu" />
      </q-list>
      <!-- Stores published before menus existed. -->
      <q-list v-else bordered padding>
        <q-item clickable v-ripple to="/" @click="closeMenu">
          <q-item-section avatar>
            <q-icon :name="matHome" />
          </q-item-section>
          <q-item-section>{{ t('Home') }}</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/products/" @click="closeMenu">
          <q-item-section avatar>
            <q-icon :name="matStorefront" />
          </q-item-section>
          <q-item-section>{{ t('Products') }}</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/cart/" @click="closeMenu">
          <q-item-section avatar>
            <q-icon :name="matShoppingCart" />
          </q-item-section>
          <q-item-section>{{ t('Cart') }}</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/checkout/" @click="closeMenu">
          <q-item-section avatar>
            <q-icon :name="matReceipt" />
          </q-item-section>
          <q-item-section>{{ t('Checkout') }}</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/my-account/" @click="closeMenu">
          <q-item-section avatar>
            <q-icon :name="matPerson" />
          </q-item-section>
          <q-item-section>{{ t('My Account') }}</q-item-section>
        </q-item>
      </q-list>
      <!-- The store's other languages, under the menu. -->
      <LanguageSwitcher class="q-mt-md q-px-sm" />
    </div>

    <q-banner
        v-if="vapidConfigured && supported && permission !== 'granted' && permission !== 'denied'"
        class="bg-secondary text-white q-ma-md rounded-borders shadow-2"
        inline-actions
    >
      <div class="text-subtitle1">
        {{ t('Enable push notifications?') }}
      </div>

      <template #action>
        <q-btn
            style="line-height: 1;"
            outline
            padding="sm"
            color="secondary"
            text-color="white"
            :label="t('Enable')"
            @click="emit('subscribe')"
        />
      </template>
    </q-banner>
  </q-scroll-area>
</template>

<script setup>
import MobileNavItems from "./MobileNavItems.vue"
import LanguageSwitcher from './LanguageSwitcher.vue'
import {
  matClose,
  matShoppingCart,
  matHome,
  matStorefront,
  matReceipt,
  matPerson
} from '@quasar/extras/material-icons'

const vapidConfigured = !!import.meta.env.VITE_VAPID_APP_PUBLIC_KEY

defineProps({
  // The header menu: [ { label, url, new_tab, external, children } ]; null before the store published one.
  menu: {
    type: Array,
    default: null
  },
  supported: {
    type: Boolean,
    required: true
  },
  permission: {
    type: String,
    required: true
  },
  isSuperAdmin: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits([
  'close',
  'subscribe'
])

function closeMenu() {
  emit('close')
}
</script>