<template>
  <div v-if="sku" class="product-sku" :class="text.class" :style="text.style">{{ d.label || t('SKU:') }} <span>{{ sku }}</span></div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

/** "Product SKU" (product page template): the chosen variant's SKU, else the product's. Nothing without one. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const text = computed(() => textStyle(d.value, tsKeys('text')))
const sku = computed(() => String(p?.selectedVariation?.sku || p?.product?.sku || '').trim())
</script>

<style scoped>
.product-sku { font-size: 14px; opacity: .85; }
</style>
