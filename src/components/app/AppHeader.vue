<template>
  <q-header :class="!stickyHeader ? '' : 'sticky'" style="padding: 5px 0; background-color: var(--q-bg)">
    <div class="container">
      <q-toolbar class="flex justify-between q-pa-sm">
        <div class="flex nav-items-el">
          <!-- Desktop Navigation -->
          <q-toolbar-title class="nav-bar gt-sm">
            <!-- The owner's menu (Design → Menus); stores published before menus existed keep the old links. -->
            <NavMenu v-if="Array.isArray(menu)" :items="menu" />
            <template v-else>
              <router-link to="/" class="text-h6 no-decoration">{{ t('Home') }}</router-link>
              <router-link to="/products/" class="text-h6 no-decoration">{{ t('Products') }}</router-link>
              <router-link to="/cart/" class="text-h6 no-decoration">{{ t('Cart') }}</router-link>
              <router-link to="/checkout/" class="text-h6 no-decoration">{{ t('Checkout') }}</router-link>
              <router-link to="/my-account/" class="text-h6 no-decoration">{{ t('My account') }}</router-link>
            </template>
          </q-toolbar-title>

          <!-- Mobile Menu Toggle -->
          <q-btn flat dense :icon="matMenu" :aria-label="t('Open menu')" data-action="menu" class="lt-md" @click="emit('open-menu')" />

        </div>
        <router-link to="/" :aria-label="t('Navigate to home page')" class="flex items-center order-first">
          <img v-if="appLogo" :alt="storeName ? t('{name} logo', { name: storeName }) : t('Logo')" :src="appLogo" width="84" height="19" loading="eager" decoding="sync" fetchpriority="high" />
          <!-- No logo yet: the store's name instead of a broken image. -->
          <span v-else class="header-store-name">{{ storeName || t('Home') }}</span>
        </router-link>
        <div class="flex items-center no-wrap">
          <LanguageSwitcher class="gt-sm" />
          <q-btn flat dense :icon="matFavoriteBorder" :aria-label="t('Add to wishlist')" data-action="wishlist" @click="emit('toggle-wishlist')" class="q-ml-sm q-mr-sm">
            <q-no-ssr>
              <q-badge v-if="wishlist.state.items && Object.keys(wishlist.state.items).length > 0" floating color="red">{{ Object.keys(wishlist.state.items).length }}</q-badge>
            </q-no-ssr>
          </q-btn>

          <q-btn flat dense :icon="matShoppingCart" :aria-label="t('View cart')" data-action="cart" @click="emit('toggle-cart')">
            <q-no-ssr>
              <q-badge v-if="cart.state.items_count > 0" floating color="red">{{ cart.state.items_count }}</q-badge>
            </q-no-ssr>
          </q-btn>
        </div>
      </q-toolbar>
    </div>
  </q-header>
</template>

<script setup>
import { matShoppingCart,
  matFavoriteBorder,
  matMenu } from '@quasar/extras/material-icons'
import wishlist from 'src/stores/wishlist'
import NavMenu from './NavMenu.vue'
import LanguageSwitcher from './LanguageSwitcher.vue'
import cart from 'src/stores/cart'

const storeName = process.env.STORE_NAME || ''

defineProps({
  isSuperAdmin: {
    type: Boolean,
    required: true
  },
  appLogo: {
    type: String,
    default: ''
  },
  stickyHeader: {
    type: Boolean,
    default: false,
    required: true
  },
  // The header menu: [ { label, url, new_tab, external, children } ]; null before the store published one.
  menu: {
    type: Array,
    default: null
  }
})

const emit = defineEmits([
  'open-menu',
  'toggle-cart',
  'toggle-wishlist'
])

</script>