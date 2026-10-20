<template>
  <!-- Built from the All products template (Store builder → Shop pages): the blocks
       read the products and filters from this page (provide 'productArchive'). -->
  <div class="main-wrapper-div">
    <SectionRenderer :sections="sections" page="shop" />
  </div>
</template>

<script setup>
import { computed, markRaw, provide, reactive } from 'vue'
import { createArchivePreFetch, useProductArchive } from 'src/composables/useProductArchive'
import SectionRenderer from '../components/sections/SectionRenderer.vue'
import { shopSections } from 'src/utils/shop-templates.js'

defineOptions({preFetch: createArchivePreFetch('shop')})

const {
  search, selectedCategory, currentPage, sortBy, filtersOpen,
  priceMin, priceMax, priceRange, isHydrated,
  categoryOptions, paginatedProducts, totalPages, totalProducts,
  sortOptions, onPriceChange, scrollToTop, productsStore, shopSettings
} = useProductArchive('shop')

const sections = computed(() => shopSections('shop', shopSettings.value))

// What the template's blocks show and do (src/components/blocks/shop/Archive*Block.vue).
provide('productArchive', reactive({
  mode: 'shop', search, selectedCategory, selectedCategoryOBJ: null, safeCategoryName: '', currentPage, sortBy, filtersOpen,
  priceMin, priceMax, priceRange, isHydrated, categoryOptions, paginatedProducts, totalPages, totalProducts,
  sortOptions, onPriceChange, scrollToTop, productsStore: markRaw(productsStore), shopSettings,
}))
</script>
