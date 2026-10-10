<template>
  <nav v-if="others.length" class="lang-switcher" :aria-label="t('Language')">
    <a
      v-for="code in others"
      :key="code"
      :href="hrefOf(code)"
      :hreflang="code"
      :lang="code"
      class="lang-link no-decoration"
    >
      <!-- eslint-disable-next-line vue/no-v-html -- fixed flag drawings from FLAGS below -->
      <span class="lang-flag" aria-hidden="true" v-html="FLAGS[flagOf(code)] || ''" />
      <span>{{ LANGUAGES[code]?.name || code }}</span>
    </a>
  </nav>
</template>

<script setup>
/**
 * Links to this page in the store's other languages (an extra language is
 * the same address behind its prefix), each with its country's flag. A full
 * page load: each language is its own app.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { LANGUAGES } from 'src/i18n/index.js'
import { allLangs, currentLang, prefixOf, withLang } from 'src/i18n/lang.js'

// Small flags drawn here (emoji flags don't show on Windows).
const FLAGS = {
  il: '<svg viewBox="0 0 22 16"><rect width="22" height="16" fill="#fff"/><rect y="1.6" width="22" height="2.2" fill="#0038b8"/><rect y="12.2" width="22" height="2.2" fill="#0038b8"/><path d="M11 4.6l2.6 4.5H8.4zM11 11.4L8.4 6.9h5.2z" fill="none" stroke="#0038b8" stroke-width=".8"/></svg>',
  us: '<svg viewBox="0 0 22 16"><rect width="22" height="16" fill="#b22234"/><path d="M0 1.85h22M0 4.3h22M0 6.8h22M0 9.25h22M0 11.7h22M0 14.15h22" stroke="#fff" stroke-width="1.23"/><rect width="9.5" height="8.6" fill="#3c3b6e"/></svg>',
  gb: '<svg viewBox="0 0 22 16"><rect width="22" height="16" fill="#012169"/><path d="M0 0l22 16M22 0L0 16" stroke="#fff" stroke-width="3"/><path d="M0 0l22 16M22 0L0 16" stroke="#c8102e" stroke-width="1.2"/><path d="M11 0v16M0 8h22" stroke="#fff" stroke-width="5"/><path d="M11 0v16M0 8h22" stroke="#c8102e" stroke-width="3"/></svg>',
}

// English shows the UK flag when its address prefix says so (/uk/, /gb/), else the US one.
const flagOf = (code) => (code === 'he' ? 'il' : code === 'en' ? (['uk', 'gb'].includes(prefixOf(code)) ? 'gb' : 'us') : '')

const route = useRoute()
const others = computed(() => allLangs().filter((c) => c !== currentLang()))
const hrefOf = (code) => withLang(route.fullPath, code)
</script>

<style scoped>
.lang-switcher { display: inline-flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; }
.lang-link { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: inherit; opacity: .85; }
.lang-link:hover, .lang-link:focus-visible { opacity: 1; text-decoration: underline; }
.lang-flag { display: inline-flex; width: 22px; height: 16px; border-radius: 2px; overflow: hidden; box-shadow: 0 0 0 1px rgba(0, 0, 0, .12); }
.lang-flag :deep(svg) { width: 100%; height: 100%; display: block; }
</style>
