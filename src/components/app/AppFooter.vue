<template>
  <!-- Built in the Store builder (Header & footer → Footer), when it has sections. -->
  <footer v-if="sections.length" class="sb-footer">
    <SectionRenderer :sections="sections" page="footer" />
    <MadeWithBadge />
  </footer>
  <footer v-else class="app-footer">
    <div class="container flex justify-between">
      <div class="footer-column first">
        <!-- The store's own logo, or its name when it has none. -->
        <router-link to="/" class="footer-brand" :aria-label="t('Navigate to home page')">
          <img v-if="appLogo" :src="appLogo" :alt="storeName ? `${storeName} logo` : t('Logo')" loading="lazy" decoding="async" />
          <span v-else-if="storeName" class="footer-store-name">{{ storeName }}</span>
        </router-link>
        <p v-if="footerText">{{ footerText }}</p>
      </div>
      <!-- The owner's footer columns (Design → Menus); a column's title is optional. -->
      <template v-if="Array.isArray(columns)">
        <div v-for="(column, i) in columns" :key="i" class="footer-column">
          <h2 v-if="column.title" class="links-title">{{ column.title }}</h2>
          <nav :aria-label="column.title || t('Footer links')">
            <FooterLinks :items="column.links" />
          </nav>
        </div>
      </template>
      <template v-else>
      <!-- A store with no footer of its own: only links that always exist (2026-11-26; the old list
           pointed at pages most stores don't have). -->
      <div class="footer-column">
        <h2 class="links-title">{{ t('Shop') }}</h2>
        <nav>
          <router-link to="/products">{{ t('Shop All') }}</router-link>
          <router-link to="/my-account">{{ t('My account') }}</router-link>
        </nav>
      </div>
      </template>
      <div class="footer-bottom">
        <span>{{ copyright }}</span>
      </div>
    </div>
    <MadeWithBadge />
  </footer>
</template>
<script setup>
import FooterLinks from "./FooterLinks.vue"
import SectionRenderer from "components/sections/SectionRenderer.vue"
import MadeWithBadge from "./MadeWithBadge.vue"
import { useI18n } from 'src/i18n/index.js'
import { storeName as liveStoreName } from 'src/utils/site-info.js'

const storeName = liveStoreName()
const { t } = useI18n()
const copyright = `© ${new Date().getFullYear()}${storeName ? ` ${storeName}` : ''}. ${t('All rights reserved.')}`

defineProps({
  // The footer's sections (the chosen footer template's, or the main footer's).
  sections: {
    type: Array,
    default: () => []
  },
  // The store's logo (Design → Branding).
  appLogo: {
    type: String,
    default: ''
  },
  footerText: {
    type: String,
    default: '',
    required: false
  },
  // The footer columns: [ { title, links } ]; null on stores published before menus existed.
  columns: {
    type: Array,
    default: null
  }
})
</script>
