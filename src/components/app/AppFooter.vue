<template>
  <footer>
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
      <div class="footer-column">
        <h2 class="links-title">{{ t('Shop') }}</h2>
        <nav>
          <router-link to="/products">{{ t('Shop All') }}</router-link>
          <router-link to="/product-category/best-sellers">{{ t('Best Sellers') }}</router-link>
          <router-link to="/product-category/new-arrival">{{ t('New Arrival') }}</router-link>
          <router-link to="/gift-card">{{ t('Gift Card') }}</router-link>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="links-title">{{ t('Experience') }}</h2>
        <nav>
          <router-link to="/sustainability">{{ t('Sustainability') }}</router-link>
          <router-link to="/our-story">{{ t('Our Story') }}</router-link>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="links-title">{{ t('Support') }}</h2>
        <nav>
          <router-link to="/shipping-and-returns">{{ t('Shipping & Returns') }}</router-link>
          <router-link to="/privacy-policy">{{ t('Privacy Policy') }}</router-link>
          <router-link to="/terms-of-service">{{ t('Terms of Service') }}</router-link>
          <router-link to="/contact-us">{{ t('Contact Us') }}</router-link>
        </nav>
      </div>
      </template>
      <div class="footer-bottom">
        <span>{{ copyright }}</span>
      </div>
    </div>
  </footer>
</template>
<script setup>
import FooterLinks from "./FooterLinks.vue"
import { useI18n } from 'src/i18n/index.js'

const storeName = process.env.STORE_NAME || ''
const { t } = useI18n()
const copyright = `© ${new Date().getFullYear()}${storeName ? ` ${storeName}` : ''}. ${t('All rights reserved.')}`

defineProps({
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
