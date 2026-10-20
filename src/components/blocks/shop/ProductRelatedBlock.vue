<template>
  <RelatedProductsSlider
      v-if="p?.product"
      :product-id="p.product.id"
      :category-id="p.product.categories?.[0]?.id"
      :title="d.title || ''"
      :card="Array.isArray(d.card) && d.card.length ? d.card : null"
  />
</template>

<script setup>
import { computed, inject } from 'vue'
import RelatedProductsSlider from 'components/shop/RelatedProductsSlider.vue'

/** "Related Products" (product page template): others from the product's first category. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
</script>
