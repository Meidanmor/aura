<template>
  <div v-if="target" class="also-in-bar" role="region" :lang="target" :dir="LANGUAGES[target]?.dir" :aria-label="text.label">
    <span>{{ text.label }}</span>
    <a :href="withLang(route.fullPath, target)" :hreflang="target" class="also-in-go" @click="rememberLanguage(target)">{{ text.go }}</a>
    <button type="button" class="also-in-close" :aria-label="text.close" @click="dismiss">✕</button>
  </div>
</template>

<script setup>
/**
 * "This store is also in English": shown once the page is in the browser
 * when the visitor's browser prefers another of the store's languages, and
 * they haven't chosen one yet. Written in that other language (the visitor
 * may not read this one). Browser only, so the server-rendered page and the
 * first render match.
 */
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { LANGUAGES } from 'src/i18n/index.js'
import { allLangs, currentLang, withLang } from 'src/i18n/lang.js'
import { chosenLanguage, rememberLanguage } from './languageChoice.js'

const TEXTS = {
  en: { label: 'This store is also in English', go: 'Switch to English', close: 'Close' },
  he: { label: 'החנות זמינה גם בעברית', go: 'מעבר לעברית', close: 'סגירה' },
}

const route = useRoute()
const target = ref('')
const text = computed(() => TEXTS[target.value] || TEXTS.en)

onMounted(() => {
  if (allLangs().length < 2 || chosenLanguage() || new URLSearchParams(window.location.search).get('qwoo_editor') === '1') return
  const here = currentLang()
  // The first of the browser's languages the store has.
  const wanted = (navigator.languages || [navigator.language || ''])
    .map((tag) => String(tag).toLowerCase().split('-')[0])
    .find((code) => allLangs().includes(code))
  if (wanted && wanted !== here) target.value = wanted
})

function dismiss() {
  rememberLanguage(currentLang())
  target.value = ''
}
</script>

<style scoped>
.also-in-bar {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px 14px;
  padding: 8px 44px; position: relative; font-size: 14px;
  background: #111; color: #fff;
}
.also-in-go { color: inherit; font-weight: 700; text-decoration: underline; }
.also-in-close {
  position: absolute; inset-inline-end: 8px; top: 50%; transform: translateY(-50%);
  background: none; border: 0; color: inherit; font-size: 16px; cursor: pointer; padding: 6px;
}
</style>
