<template>
  <div class="main-wrapper-div">
    <div class="container">
      <SectionRenderer :sections="shopSettings?.sections" location="before_breadcrumbs"/>
      <q-breadcrumbs>
          <q-breadcrumbs-el label="Home" to="/" />
          <q-breadcrumbs-el label="Products" />
        </q-breadcrumbs>
      <SectionRenderer :sections="shopSettings?.sections" location="after_breadcrumbs"/>


      <h1>Products</h1>
      <div class="archive-layout flex no-wrap">

        <div class="filters-wrap flex" :class="{ 'shown': filtersOpen }" @pointerdown.stop >
          <SectionRenderer :sections="shopSettings?.sections" location="before_filters"/>

          <q-scroll-area class="fit">

          <div class="sticky filters-drawer-header flex justify-between q-mb-md">
          <div class="text-h6">Filters</div>
            <q-btn
                class="mobile-only"
                :icon="matClose"
                flat
                dense
                @click="filtersOpen = false"
                aria-label="Close filters drawer"
            />
        </div>

        <!-- Search and Filter -->
        <div class="col-xs-12 col-md-6 q-mb-md">
            <q-input filled v-model="search" label="Search products..." debounce="300" />
        </div>

        <div class="filters-inner-wrap col-xs-12 col-md-6"  v-if="!isHydrated && !categoryOptions.length">
          <q-skeleton type="rect" class="q-mb-md"/>
        </div>

        <div class="col-xs-12 col-md-6" v-else>
          <q-card class="filters-inner-wrap q-pa-md q-mb-md">
            <div class="text-subtitle1 q-mb-sm">
              Filter by Category
            </div>
            <q-option-group
                v-model="selectedCategory"
                :options="categoryOptions"
                type="checkbox"
                color="secondary"
            />
          </q-card>
        </div>

        <PriceFilterCard v-model="priceRange" :min="priceMin" :max="priceMax" @change="onPriceChange" />
        </q-scroll-area>

        </div>
        <div class="products-wrap">

          <div v-if="paginatedProducts.length" class="flex justify-between q-mb-md total-products">
            <div v-if="totalProducts" class="text-subtitle1 q-mb-sm">
              Found {{ totalProducts || 0 }} product{{ totalProducts === 1 ? '' : 's' }}
            </div>
          </div>

          <SortBar
              v-if="paginatedProducts.length"
              v-model:sortBy="sortBy"
              :sortOptions="sortOptions"
              @toggle-filters="filtersOpen = !filtersOpen"
          />

          <SectionRenderer :sections="shopSettings?.sections" location="before_products_grid"/>

          <ProductResultsGrid :loading="productsStore.productsLoading.value" :products="paginatedProducts"/>

          <SectionRenderer :sections="shopSettings?.sections" location="after_products_grid"/>

          <!-- Pagination -->
          <ArchivePagination
              v-model="currentPage"
              :totalPages="totalPages"
              @page-change="scrollToTop"
          />

        </div>
      </div>
      <SectionRenderer :sections="shopSettings?.sections" location="after_pagination"/>

    </div>
  </div>
</template>

<script setup>
import { createArchivePreFetch, useProductArchive } from 'src/composables/useProductArchive'
import { matClose } from '@quasar/extras/material-icons'
import PriceFilterCard from '../components/shop/PriceFilterCard.vue'
import ProductResultsGrid from '../components/shop/ProductResultsGrid.vue';
import ArchivePagination from '../components/shop/ArchivePagination.vue';
import SortBar from '../components/shop/SortBar.vue';
import SectionRenderer from '../components/sections/SectionRenderer.vue'

defineOptions({preFetch: createArchivePreFetch('shop')})

const {
  search, selectedCategory, currentPage, sortBy, filtersOpen,
  priceMin, priceMax, priceRange, isHydrated,
  categoryOptions, paginatedProducts, totalPages, totalProducts,
  sortOptions, onPriceChange, scrollToTop, productsStore, shopSettings
} = useProductArchive('shop')



</script>

<style scoped>
@import 'src/css/product-archive.css';
</style>
