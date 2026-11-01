<template>
  <!-- The Free plan (the store's pointer says `free`): a small line at the very bottom of the footer. -->
  <div v-if="shown" class="made-with">
    <a :href="href" target="_blank" rel="noopener">{{ t('Made with YallaFlow') }}</a>
  </div>
</template>

<script setup>
import { useI18n } from 'src/i18n/index.js'
import { currentLang } from 'src/i18n/lang.js'
import { showMadeWith } from 'src/utils/site-info.js'

// YallaFlow's own site (Hebrew at /, English at /en/). Change here when the domain is bought.
const SITE = 'https://yallaflow-web.vercel.app/'

const { t } = useI18n()
const shown = showMadeWith()
const href = currentLang() === 'he' ? SITE : `${SITE}en/`
</script>

<style>
.made-with {
  padding: 10px 16px;
  text-align: center;
  font-size: 12px;
  line-height: 1.4;
  opacity: 0.75;
}
.made-with a {
  color: inherit;
  text-decoration: none;
}
.made-with a:hover,
.made-with a:focus-visible {
  text-decoration: underline;
}
</style>
