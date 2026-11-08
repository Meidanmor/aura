<template>
  <div class="gc-preview">
    <div class="gc-preview__head">
      <b>{{ t('The email they\'ll get') }}</b>
      <span>{{ whenText }}</span>
    </div>
    <div class="gc-preview__inbox">
      <iframe
          v-if="mounted && html"
          ref="frame"
          class="gc-preview__frame"
          :srcdoc="html"
          sandbox="allow-same-origin"
          :title="t('The email they\'ll get')"
          :style="{ height: `${height}px` }"
          @load="measure"
      />
      <div v-else class="gc-preview__wait"><q-spinner v-if="!failed" size="28px" /><span v-else>{{ t('The preview isn\'t available right now.') }}</span></div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { t } from 'src/i18n/index.js'
import { dateLabel, fillPreview, giftSettings, giftState, loadTemplate } from 'src/utils/gift-card.js'

/**
 * The gift card email as the recipient will get it, filled in as the shopper
 * types (the store's own email, see Qwoo_Gift_Cards::rest_preview). Drawn in
 * a frame that runs no scripts. Only in the browser (its own mounted flag).
 */
const props = defineProps({ product: { type: Object, required: true } })
const g = computed(() => giftSettings(props.product))
const s = computed(() => giftState(props.product))
const template = ref('')
const failed = ref(false)
const mounted = ref(false)
const frame = ref(null)
const height = ref(640)

const html = computed(() => fillPreview(template.value, s.value, g.value, props.product))
const whenText = computed(() => (s.value?.when === 'date' && s.value.send_on ? t('Sent on {date}', { date: dateLabel(s.value.send_on) }) : t('Sent right after payment')))

function measure() {
  try {
    const doc = frame.value?.contentDocument
    if (doc?.body) height.value = Math.max(320, Math.min(2400, doc.documentElement.scrollHeight))
  } catch { /* the frame keeps its height */ }
}
watch(html, () => nextTick(() => setTimeout(measure, 60)))

onMounted(async () => {
  mounted.value = true
  template.value = await loadTemplate(props.product.id)
  failed.value = !template.value
})
</script>

<style scoped>
.gc-preview__head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 8px; font-size: 13px; }
.gc-preview__head b { font-size: 14px; }
.gc-preview__inbox { background: rgba(0, 0, 0, .06); border-radius: 14px; padding: 10px; }
.gc-preview__frame { display: block; width: 100%; border: 0; border-radius: 10px; background: #f4f4f7; }
.gc-preview__wait { display: grid; place-items: center; min-height: 320px; font-size: 14px; opacity: .7; }
</style>
