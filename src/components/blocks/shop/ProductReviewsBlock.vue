<template>
  <ProductReviews v-if="p?.product && p.reviewsOn" :key="p.product.id" :product-id="p.product.id" />
</template>

<script setup>
import { inject } from 'vue'
import ProductReviews from 'components/shop/ProductReviews.vue'

/** "Product Reviews" (product page template): shown when the store has reviews on. */
defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
</script>
