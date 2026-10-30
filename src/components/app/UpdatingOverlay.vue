<template>
  <div v-if="importing" class="qwoo-updating" role="alertdialog" aria-modal="true" :aria-label="t('We\'re updating the store')">
    <div class="qwoo-updating__card">
      <span class="qwoo-updating__spin" aria-hidden="true" />
      <p class="qwoo-updating__title">{{ t('We\'re updating the store') }}</p>
      <p class="qwoo-updating__text">{{ t('We\'ll be back in a few minutes. Thanks for waiting!') }}</p>
    </div>
  </div>
</template>

<script setup>
/**
 * While the store brings in a store copy file or an old store (dashboard → Settings), its pages
 * show under this overlay and nothing can be bought (the store refuses cart changes meanwhile).
 * It asks /__site/current (the store's pointer: `importing`) after the page loads and every
 * 15 seconds; when the import ends, the page loads again with the new content.
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { t } from 'src/i18n/index.js'

const importing = ref(false)
let timer = 0

async function check() {
  clearTimeout(timer)
  try {
    const res = await fetch('/__site/current', { cache: 'no-store' })
    const now = !!(res.ok && (await res.json())?.importing)
    if (importing.value && !now) {
      location.reload()
      return
    }
    importing.value = now
  } catch {
    // Offline or a missed check: try again later.
  }
  timer = setTimeout(check, importing.value ? 10000 : 15000)
}

onMounted(check)
onUnmounted(() => clearTimeout(timer))
</script>

<style>
.qwoo-updating {
  position: fixed; inset: 0; z-index: 20000;
  display: flex; align-items: center; justify-content: center; padding: 16px;
  background: rgba(255, 255, 255, .72); backdrop-filter: blur(3px);
}
.qwoo-updating__card {
  max-width: 360px; padding: 28px 24px; border-radius: 16px; text-align: center;
  background: #fff; color: #222; box-shadow: 0 12px 40px rgba(0, 0, 0, .15);
}
.qwoo-updating__title { margin: 12px 0 4px; font-size: 1.2rem; font-weight: 700; }
.qwoo-updating__text { margin: 0; opacity: .75; }
.qwoo-updating__spin {
  display: inline-block; width: 28px; height: 28px; border-radius: 50%;
  border: 3px solid rgba(0, 0, 0, .12); border-top-color: var(--q-secondary, #333);
  animation: qwoo-updating-spin 1s linear infinite;
}
@keyframes qwoo-updating-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .qwoo-updating__spin { animation: none; } }
</style>
