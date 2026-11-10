<template>
  <div class="qwoo-personalized-offer" :style="styleVars">
    <div v-if="data.title" class="qwoo-personalized-offer__title">{{ data.title }}</div>
    <div v-if="data.description" class="qwoo-personalized-offer__description">{{ data.description }}</div>
    <div v-if="data.coupon_code" class="qwoo-personalized-offer__coupon">
      <code>{{ data.coupon_code }}</code>
      <q-btn dense no-caps outline :label="copied ? t('Copied') : (data.button_label || t('Copy code'))" @click="copyCode" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'src/i18n/index.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'

const props = defineProps({ data: { type: Object, default: () => ({}) } })
const { t } = useI18n()
const copied = ref(false)
const styleVars = computed(() => ({
  textAlign: props.data.alignment || 'center',
  color: resolveGlobalColor(props.data.text_color) || undefined,
  background: resolveGlobalColor(props.data.background) || undefined,
  '--qwoo-offer-button': resolveGlobalColor(props.data.button_color) || undefined,
}))
async function copyCode() {
  const code = String(props.data.coupon_code || '').trim()
  if (!code) return
  try {
    await navigator.clipboard.writeText(code)
    copied.value = true
    window.setTimeout(() => { copied.value = false }, 1800)
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[personalized-offer] clipboard unavailable', error)
  }
}
</script>

<style scoped>
.qwoo-personalized-offer { padding: 20px; border-radius: 12px; }
.qwoo-personalized-offer__title { font-size: 1.2em; font-weight: 600; }
.qwoo-personalized-offer__description { margin-top: 6px; }
.qwoo-personalized-offer__coupon { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 12px; }
.qwoo-personalized-offer__coupon code { padding: 8px 12px; border: 1px dashed currentColor; border-radius: 6px; }
.qwoo-personalized-offer :deep(.q-btn) { color: var(--qwoo-offer-button, inherit); }
</style>
