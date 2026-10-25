<template>
  <div v-if="items.length" class="product-faq">
    <component :is="titleTag" v-if="d.title" class="product-faq__title" :class="titleText.class" :style="titleText.style">{{ d.title }}</component>
    <FaqBlock :data="faqData" :block-id="blockId" />
  </div>
</template>

<script setup>
import { computed, inject, onMounted } from 'vue'
import FaqBlock from 'components/blocks/FaqBlock.vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

/**
 * "Product Questions" (product page template): the product's own questions and
 * answers (Products → a product), then the block's questions for every product.
 * Drawn by the FAQ block, with the same look settings. Nothing when there are none.
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))
const titleTag = 'h2'

// The product's answers are plain text: escaped, line breaks kept.
const escape = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const asHtml = (text) => escape(text).split(/\n{2,}/).map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`).join('')

const items = computed(() => {
  const own = (p?.product?.extensions?.qwoo?.faq || []).map((i) => ({ question: i.q, answer: asHtml(i.a) }))
  const extra = (d.value.extra || []).filter((i) => i.question)
  return [...own, ...extra]
})
const faqData = computed(() => ({ data: { ...d.value, items: items.value } }))

onMounted(() => p?.loadExtras?.())
</script>

<style scoped>
.product-faq__title { margin: 0 0 16px; font-size: 1.5em; line-height: 1.25; }
</style>
