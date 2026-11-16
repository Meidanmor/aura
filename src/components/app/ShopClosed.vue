<template>
  <!-- A shop address while the shop is off and the owner chose "Show a message" (src/utils/shop-mode.js). -->
  <section class="shop-closed-page">
    <div class="container shop-closed-inner text-center">
      <h1>{{ message }}</h1>
      <q-btn unelevated color="secondary" text-color="primary" class="btn-big" to="/" :label="t('Back to Homepage')" />
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useMeta } from 'quasar'
import { useI18n } from 'src/i18n/index.js'
import { currentLang } from 'src/i18n/lang.js'
import { closedMessage } from 'src/utils/shop-mode.js'

const { t } = useI18n()
const message = computed(() => closedMessage(currentLang()) || t('Our online shop is closed for now. Come back soon!'))

useMeta(() => ({
  title: message.value,
  meta: { robots: { name: 'robots', content: 'noindex, follow', key: 'robots' } },
}))
</script>

<style scoped>
.shop-closed-page { padding: 96px 0; }
.shop-closed-inner { display: flex; flex-direction: column; align-items: center; gap: 24px; }
.shop-closed-inner h1 { margin: 0; font-size: clamp(24px, 4vw, 36px); line-height: 1.25; max-width: 32ch; text-wrap: balance; }
</style>
