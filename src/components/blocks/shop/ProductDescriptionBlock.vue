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
