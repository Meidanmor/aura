<template>
  <ErrorNotFound v-if="notFound" />
  <!-- Built from the category page template (Store builder → Shop pages), or the layout made
       for this category: the blocks read the products and filters from this page. -->
  <div v-else class="main-wrapper-div">
    <SectionRenderer :sections="categorySections" page="category" />
  </div>
</template>

<script setup>
import { computed, markRaw, provide, reactive } from 'vue'
import { createArchivePreFetch, useProductArchive } from 'src/composables/useProductArchive'
import { categoryMatch } from 'src/utils/layouts.js'
import { shopSections } from 'src/utils/shop-templates.js'
import { useSanitizedText } from 'src/composables/useSanitizedHtml'
import SectionRenderer from "components/sections/SectionRenderer.vue";
import ErrorNotFound from "pages/ErrorNotFound.vue";

defineOptions({ preFetch: createArchivePreFetch('category') })

const {
  search, selectedCategoryOBJ, currentPage, sortBy, filtersOpen,
  priceMin, priceMax, priceRange, isHydrated,
  paginatedProducts, totalPages, totalProducts,
  sortOptions, onPriceChange, scrollToTop, productsStore, shopSettings, notFound
} = useProductArchive('category')
// The category's layout (Store builder): one made for this category, else the default.
const categorySections = computed(() => shopSections('category', shopSettings.value, categoryMatch(selectedCategoryOBJ.value)))

const safeCategoryName = useSanitizedText(() => selectedCategoryOBJ.value?.name)

// What the template's blocks show and do (src/components/blocks/shop/Archive*Block.vue).
provide('productArchive', reactive({
  mode: 'category', search, selectedCategory: [], selectedCategoryOBJ, safeCategoryName, currentPage, sortBy, filtersOpen,
  priceMin, priceMax, priceRange, isHydrated, categoryOptions: [], paginatedProducts, totalPages, totalProducts,
  sortOptions, onPriceChange, scrollToTop, productsStore: markRaw(productsStore), shopSettings,
}))
</script>
