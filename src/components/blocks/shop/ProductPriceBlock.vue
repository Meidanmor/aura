<template>
  <div v-if="p?.product" class="product-price" :class="priceText.class" :style="[{ textAlign: align }, priceText.style]">
    <q-skeleton v-if="p.variationLoading" type="text" width="120px" />
    <div v-else-if="p.selectedVariation" v-html="p.safeVariationPrice"></div>
    <div v-else v-html="p.safePrice"></div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

/** "Product Price" (product page template): the chosen variant's price once one is chosen. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const priceText = computed(() => textStyle(d.value, tsKeys('price')))
const align = computed(() => (['left', 'center', 'right'].includes(d.value.align) ? d.value.align : 'start'))
</script>

<style scoped>
/* The sale price (WooCommerce <ins>) is not a link: no underline; the old price is struck and quieter. */
.product-price :deep(ins) { text-decoration: none; }
.product-price :deep(del) { opacity: .5; font-weight: 400; font-size: .75em; margin-inline-end: 8px; }
</style>
