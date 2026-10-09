<template>
  <nav v-if="others.length" class="lang-switcher" :aria-label="t('Language')">
    <a
      v-for="code in others"
      :key="code"
      :href="hrefOf(code)"
      :hreflang="code"
      :lang="code"
      class="lang-link no-decoration"
      @click="remember(code)"
    >{{ LANGUAGES[code]?.name || code }}</a>
  </nav>
</template>

<script setup>
/**
 * Links to this page in the store's other languages (an extra language is
 * the same address behind its prefix). A full page load: each language is
 * its own app. The choice is remembered, so the "also in" bar stays away.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { LANGUAGES } from 'src/i18n/index.js'
import { allLangs, currentLang, withLang } from 'src/i18n/lang.js'
import { rememberLanguage } from './languageChoice.js'

const route = useRoute()
const others = computed(() => allLangs().filter((code) => code !== currentLang()))
const hrefOf = (code) => withLang(route.fullPath, code)
const remember = (code) => rememberLanguage(code)
</script>

<style scoped>
.lang-switcher { display: inline-flex; gap: 8px; align-items: center; margin-inline: 8px; }
.lang-link { font-size: 14px; font-weight: 600; color: inherit; opacity: .85; }
.lang-link:hover, .lang-link:focus-visible { opacity: 1; text-decoration: underline; }
</style>
