<template>
  <div class="html-block" :style="vars">
    <div class="html-block__box" :class="{ 'html-block__box--auto': auto }" :style="auto && height ? { height: height + 'px' } : null">
      <iframe
        v-if="shown"
        :key="version"
        ref="frame"
        class="html-block__frame"
        :src="HTML_FRAME_ORIGIN + '/'"
        :title="title"
        :sandbox="sandbox"
        allow="fullscreen; clipboard-write; autoplay; picture-in-picture; payment; web-share"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
      />
      <div v-else-if="editor && empty" class="html-block__empty">{{ t('Paste your code in this block\'s settings.') }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { t } from 'src/i18n/index.js'
import { setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'
import { isEditorMode } from 'src/utils/config-loader.js'
import { HTML_FRAME_ORIGIN, frameDocument } from 'src/utils/html-frame.js'

/**
 * Store builder → HTML (2026-11-23): the owner's own code, or a tool from another site, in a sealed frame on
 * its own address (src/utils/html-frame.js). Nothing of it is drawn on the server or put into this page; the
 * frame asks for its document once it has loaded, and only the store page that holds the frame can answer.
 */
const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})
const d = computed(() => props.data.data || {})
const isUrl = computed(() => d.value.source === 'url')
const url = computed(() => {
  const u = String(d.value.url || '').trim()
  try { return new URL(u).protocol === 'https:' ? u : '' } catch { return '' }
})
const code = computed(() => (typeof d.value.code === 'string' ? d.value.code : ''))
const empty = computed(() => (isUrl.value ? !url.value : !code.value.trim()))
const auto = computed(() => !isUrl.value && d.value.height_mode !== 'fixed')
const title = computed(() => String(d.value.title || '').trim() || t('Embedded content'))

const sandbox = computed(() => {
  const list = ['allow-scripts']
  // Same origin only while the frame really lives on another address than this store.
  if (typeof location === 'undefined' || location.origin !== HTML_FRAME_ORIGIN) list.push('allow-same-origin')
  if (d.value.allow_forms !== false) list.push('allow-forms')
  if (d.value.allow_popups) list.push('allow-popups', 'allow-popups-to-escape-sandbox')
  if (d.value.links_here) list.push('allow-top-navigation-by-user-activation')
  return list.join(' ')
})

const vars = computed(() => {
  const out = {}
  setResponsiveVar(out, '--hb-h', d.value.height || '480px', toCssLength)
  setResponsiveVar(out, '--hb-maxw', d.value.max_width, toCssLength)
  return out
})

// A change in the Store builder makes a new frame (the old document can't be rewritten).
const version = computed(() => {
  const s = JSON.stringify(d.value)
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
})

const mounted = ref(false)
const editor = ref(false)
const shown = computed(() => mounted.value && !empty.value)
const frame = ref(null)
const height = ref(0)

function onMessage(e) {
  const win = frame.value?.contentWindow
  if (!win || e.source !== win || e.origin !== HTML_FRAME_ORIGIN) return
  const m = e.data
  if (!m || typeof m !== 'object') return
  if (m.openlyFrame === 'ready') {
    win.postMessage({
      openlyFrame: 'html',
      html: frameDocument({
        code: code.value,
        url: isUrl.value ? url.value : '',
        title: title.value,
        theme: d.value.use_theme !== false,
        transparent: d.value.transparent !== false,
        linksHere: !!d.value.links_here,
        auto: auto.value,
      }),
    }, HTML_FRAME_ORIGIN)
  } else if (m.openlyFrame === 'height' && auto.value && Number.isFinite(m.h)) {
    height.value = Math.min(6000, Math.max(0, Math.round(m.h)))
  }
}
watch(version, () => { height.value = 0 })

onMounted(() => {
  editor.value = isEditorMode()
  window.addEventListener('message', onMessage)
  mounted.value = true
})
onBeforeUnmount(() => window.removeEventListener('message', onMessage))
</script>

<style scoped>
.html-block { display: flex; justify-content: center; }
.html-block__box { width: 100%; max-width: var(--hb-maxw, 100%); height: var(--hb-h, 480px); }
.html-block__box--auto { height: auto; min-height: 24px; }
.html-block__frame { display: block; width: 100%; height: 100%; border: 0; background: transparent; color-scheme: normal; }
.html-block__box--auto .html-block__frame { height: inherit; min-height: 24px; }
.html-block__empty { padding: 24px; border: 1px dashed currentColor; border-radius: 12px; opacity: .6; text-align: center; font-size: 14px; }
@media (max-width: 1023px) {
  .html-block__box { max-width: var(--hb-maxw-t, var(--hb-maxw, 100%)); height: var(--hb-h-t, var(--hb-h, 480px)); }
  .html-block__box--auto { height: auto; }
}
@media (max-width: 767px) {
  .html-block__box { max-width: var(--hb-maxw-m, var(--hb-maxw-t, var(--hb-maxw, 100%))); height: var(--hb-h-m, var(--hb-h-t, var(--hb-h, 480px))); }
  .html-block__box--auto { height: auto; }
}
</style>
