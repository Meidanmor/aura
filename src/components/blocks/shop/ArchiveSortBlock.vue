<template>
  <div v-if="a && (a.mode === 'category' || a.paginatedProducts.length)" class="archive-sort" :class="{ 'no-filters-btn': d.show_filters_button === false }">
    <SortBar v-model:sort-by="a.sortBy" :sort-options="a.sortOptions" @toggle-filters="a.filtersOpen = !a.filtersOpen" />
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import SortBar from 'components/shop/SortBar.vue'

/** "Sort" (All products / category page template): the order, and the "Filters" button on phones. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const a = inject('productArchive', null)
const d = computed(() => props.data.data || {})
</script>

<style scoped>
.archive-sort :deep(.q-select) { min-width: 160px; }
/* No spacing or background of its own: the block's Inner Padding, Margin and Background are the owner's. */
.archive-sort :deep(> .flex) { margin-bottom: 0; }
.no-filters-btn :deep(.filters-toggle) { display: none !important; }
</style>
