<template>
  <div v-if="a" class="archive-products">
    <ProductResultsGrid
        :loading="a.productsStore.productsLoading.value"
        :products="a.paginatedProducts"
        :priority-count="priorityCount"
        :card="card"
        :empty-text="d.empty_text || ''"
    />
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import ProductResultsGrid from 'components/shop/ProductResultsGrid.vue'

/** "Products Grid" (All products / category page template): the products, with the chosen loop template. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const a = inject('productArchive', null)
const d = computed(() => props.data.data || {})
// The block's own loop template, else the one chosen for these pages.
const card = computed(() => (Array.isArray(d.value.card) && d.value.card.length ? d.value.card : a?.shopSettings?.product_card || null))
// The page's first image is above the grid (a section with a photo): it loads first, not the first cards.
const sbPriority = inject('sbPriority', null)
const priorityCount = computed(() => {
  const pr = sbPriority?.value
  return pr?.any && !pr.blocks?.has(props.blockId) ? 0 : 3
})
</script>

<style scoped>
/* The grid's look from the old page (src/css/product-archive.css). */
.archive-products :deep(.my-card) { display: flex; flex-direction: column; justify-content: flex-start; }
.archive-products :deep(.products-inner) { flex: 100%; }
@media (max-width: 767px) {
  .archive-products :deep(.products-inner) { padding: 20px 16px 0; }
  .archive-products :deep(.products-inner > div) { width: 50%; }
  .archive-products :deep(.products-inner .q-card) { padding: 0; }
}
</style>
