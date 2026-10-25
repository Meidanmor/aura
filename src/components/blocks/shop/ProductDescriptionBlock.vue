<template>
  <div v-if="p?.product && html" class="product-description" :class="text.class" :style="text.style" v-html="html"></div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { useSanitizedDescription } from 'src/composables/useSanitizedHtml'

/** "Product Description" (product page template): the description or the short description. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const text = computed(() => textStyle(d.value, tsKeys('text')))
const short = useSanitizedDescription(() => p?.product?.short_description)
const html = computed(() => (d.value.source === 'short' ? short.value : p?.safeDescription))
</script>

<style scoped>
/* Headings inside the owner's text: sized to the text around them, not the page title's. */
.product-description :deep(h2) { font-size: 1.5em; line-height: 1.3; font-weight: 700; margin: 1.4em 0 .4em; color: var(--q-text, inherit); }
.product-description :deep(h3) { font-size: 1.25em; line-height: 1.35; font-weight: 700; margin: 1.3em 0 .35em; color: var(--q-text, inherit); }
.product-description :deep(h4) { font-size: 1.1em; line-height: 1.4; font-weight: 700; margin: 1.2em 0 .3em; color: var(--q-text, inherit); }
.product-description :deep(:is(h2, h3, h4):first-child) { margin-top: 0; }
.product-description :deep(p) { margin: 0 0 .8em; }
</style>
