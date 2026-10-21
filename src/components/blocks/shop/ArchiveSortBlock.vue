<template>
  <div v-if="a && (a.mode === 'category' || a.paginatedProducts.length)" class="archive-sort">
    <SortBar v-model:sort-by="a.sortBy" :sort-options="a.sortOptions" @toggle-filters="a.filtersOpen = !a.filtersOpen" />
  </div>
</template>

<script setup>
import { inject } from 'vue'
import SortBar from 'components/shop/SortBar.vue'

/**
 * "Sort" (All products / category page template): the order, and the "Filters"
 * button on phones unless the page has a Filters Button block.
 */
defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const a = inject('productArchive', null)
</script>

<style scoped>
.archive-sort :deep(.q-select) { min-width: 160px; }
/* No spacing or background of its own: the block's Inner Padding, Margin and Background are the owner's. */
.archive-sort :deep(> .flex) { margin-bottom: 0; }
</style>

<style>
/* A Filters Button block opens the drawer instead (CSS, so the server and browser render the same). */
body:has(.filters-btn-block) .archive-sort .filters-toggle { display: none; }
</style>
