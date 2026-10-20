<template>
  <div v-if="p?.product && links.length" class="product-share" :class="text.class" :style="text.style">
    <span class="product-share__label">{{ d.label || t('Share:') }}</span>
    <template v-for="link in links" :key="link.key">
      <button v-if="link.key === 'copy'" type="button" class="product-share__btn" :style="iconStyle" :aria-label="t('Copy the link')" @click="copy">
        <q-icon :name="copied ? matCheck : matLink" size="20px" />
      </button>
      <a v-else :href="link.href" target="_blank" rel="noopener noreferrer" class="product-share__btn" :style="iconStyle" :aria-label="link.label">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path :d="link.icon" fill="currentColor" /></svg>
      </a>
    </template>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { matCheck, matLink } from '@quasar/extras/material-icons'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { useI18n } from 'src/i18n/index.js'

/** "Share Buttons" (product page template): WhatsApp, Facebook, X, Pinterest, copy the link. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const { t } = useI18n()
const d = computed(() => props.data.data || {})
const text = computed(() => textStyle(d.value, tsKeys('text')))
const iconStyle = computed(() => (d.value.icon_color ? { color: resolveGlobalColor(d.value.icon_color) } : null))
const copied = ref(false)

// The product's address on this storefront (the store's own permalink points at WordPress).
// Known in the browser only: the links get it after hydration (the server's HTML must match).
const route = useRoute()
const origin = ref('')
onMounted(() => (origin.value = window.location.origin))
const pageUrl = () => (origin.value ? origin.value + route.path : '')
const ICONS = {
  whatsapp: 'M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z',
  facebook: 'M13.5 22v-8.2h2.8l.4-3.2h-3.2v-2c0-.9.3-1.6 1.6-1.6h1.7V4.1a23 23 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3v2.3H7.3v3.2h2.8V22h3.4Z',
  x: 'M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.3l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z',
  pinterest: 'M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.6 1.3 1.4 0 .9-.5 2.1-.8 3.3-.2 1 .5 1.8 1.5 1.8 1.8 0 3.1-1.9 3.1-4.6 0-2.4-1.7-4.1-4.2-4.1a4.4 4.4 0 0 0-4.6 4.4c0 .9.3 1.8.8 2.3l.1.4-.3 1.2c0 .2-.2.3-.4.2-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.9-6.3 3.6 0 6.4 2.6 6.4 6 0 3.6-2.3 6.5-5.4 6.5-1.1 0-2.1-.6-2.4-1.2l-.7 2.5c-.2.9-.9 2.1-1.3 2.8A10 10 0 1 0 12 2Z',
}
const links = computed(() => {
  const url = encodeURIComponent(pageUrl())
  const name = encodeURIComponent(p?.product?.name || '')
  const out = []
  if (d.value.whatsapp !== false) out.push({ key: 'whatsapp', label: 'WhatsApp', icon: ICONS.whatsapp, href: `https://wa.me/?text=${name}%20${url}` })
  if (d.value.facebook !== false) out.push({ key: 'facebook', label: 'Facebook', icon: ICONS.facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${url}` })
  if (d.value.x === true) out.push({ key: 'x', label: 'X', icon: ICONS.x, href: `https://x.com/intent/post?url=${url}&text=${name}` })
  if (d.value.pinterest === true) out.push({ key: 'pinterest', label: 'Pinterest', icon: ICONS.pinterest, href: `https://www.pinterest.com/pin/create/button/?url=${url}&description=${name}` })
  if (d.value.copy !== false) out.push({ key: 'copy' })
  return out
})

async function copy() {
  try {
    await navigator.clipboard.writeText(pageUrl())
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // no clipboard (an insecure page): nothing to do
  }
}
</script>

<style scoped>
.product-share { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 14px; }
.product-share__btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; border: 1px solid currentColor; background: none; color: inherit; cursor: pointer; padding: 0; text-decoration: none; }
.product-share__btn:hover { opacity: .75; }
</style>
