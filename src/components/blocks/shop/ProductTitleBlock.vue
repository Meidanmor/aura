<template>
  <component :is="tag" v-if="p?.product" class="product-title" :class="titleText.class" :style="[{ textAlign: align }, titleText.style]">{{ p.product.name }}</component>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

/** "Product Name" (product page template). */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))
const tag = computed(() => (d.value.tag === 'h2' ? 'h2' : 'h1'))
const align = computed(() => (['left', 'center', 'right'].includes(d.value.align) ? d.value.align : 'start'))
</script>

<style scoped>
.product-title { margin: 0; overflow-wrap: anywhere; }
</style>
