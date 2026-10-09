<template>
  <ErrorNotFound v-if="notFound" />
  <div v-else class="main-wrapper-div">
    <div class="container">
      <SectionRenderer :sections="categorySections" page="category" location="before_breadcrumbs"/>

      <q-breadcrumbs>
        <q-breadcrumbs-el :label="t('Home')" to="/" />
        <q-breadcrumbs-el :label="t('Products')" to="/products" />
        <q-breadcrumbs-el><span v-html="safeCategoryName"></span></q-breadcrumbs-el>
      </q-breadcrumbs>

      <SectionRenderer :sections="categorySections" page="category" location="after_breadcrumbs"/>

      <h1 v-html="safeCategoryName || 'Products'"></h1>

      <div class="archive-layout flex no-wrap">
        <div class="filters-wrap flex" :class="{ 'shown': filtersOpen }" @pointerdown.stop >
          <SectionRenderer :sections="categorySections" page="category" location="before_filters"/>

          <q-scroll-area class="fit">

            <div class="sticky filters-drawer-header flex justify-between q-mb-md">
              <div class="text-h6">{{ t('Filters') }}</div>
              <q-btn
                  class="mobile-only"
                  :icon="matClose"
                  flat
                  dense
                  @click="filtersOpen = false"
                  :aria-label="t('Close filters drawer')"
              />
            </div>

          <div class="col-xs-12 col-md-6 q-mb-md">
            <q-input filled v-model="search" :label="t('Search products...')" debounce="300" />
          </div>

          <PriceFilterCard v-model="priceRange" :min="priceMin" :max="priceMax" @change="onPriceChange" />
          </q-scroll-area>
        </div>

        <div class="products-wrap">
          <div class="flex justify-between q-mb-md total-products">
            <div v-if="totalProducts" class="text-subtitle1 q-mb-sm">
              {{ tn('Found {n} product', 'Found {n} products', totalProducts || 0) }}
            </div>
          </div>

          <SortBar
              v-model:sortBy="sortBy"
              :sortOptions="sortOptions"
              @toggle-filters="filtersOpen = !filtersOpen"
          />

          <SectionRenderer :sections="categorySections" page="category" location="before_products_grid"/>

          <ProductResultsGrid :loading="productsStore.productsLoading.value" :products="paginatedProducts" />

          <SectionRenderer :sections="categorySections" page="category" location="after_products_grid"/>

          <ArchivePagination
              v-model="currentPage"
              :totalPages="totalPages"
              @page-change="scrollToTop"
          />

        </div>
      </div>

      <SectionRenderer :sections="categorySections" page="category" location="after_pagination"/>

    </div>
  </div>
</template>

<script setup>
import { createArchivePreFetch, useProductArchive } from 'src/composables/useProductArchive'
import { computed } from 'vue'
import { categoryMatch, pickSections } from 'src/utils/layouts.js'
import { matClose } from '@quasar/extras/material-icons'
import PriceFilterCard from '../components/shop/PriceFilterCard.vue'
import ProductResultsGrid from '../components/shop/ProductResultsGrid.vue';
import ArchivePagination from '../components/shop/ArchivePagination.vue';
import SortBar from '../components/shop/SortBar.vue';
import { useSanitizedText } from 'src/composables/useSanitizedHtml'
import SectionRenderer from "components/sections/SectionRenderer.vue";
import ErrorNotFound from "pages/ErrorNotFound.vue";

defineOptions({ preFetch: createArchivePreFetch('category') })

const {
  search, selectedCategoryOBJ, currentPage, sortBy, filtersOpen,
  priceMin, priceMax, priceRange,
  paginatedProducts, totalPages, totalProducts,
  sortOptions, onPriceChange, scrollToTop, productsStore, shopSettings, notFound
} = useProductArchive('category')
// The category's layout (Store builder): one made for this category, else the default.
const categorySections = computed(() => pickSections(shopSettings.value, categoryMatch(selectedCategoryOBJ.value)))

const safeCategoryName = useSanitizedText(() => selectedCategoryOBJ.value?.name)

</script>
<style scoped>
@import 'src/css/product-archive.css';
</style>