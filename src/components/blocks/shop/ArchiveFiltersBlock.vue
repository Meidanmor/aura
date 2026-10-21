<template>
  <!-- Phones: a tap beside the open drawer closes it. -->
  <div v-if="a" class="filters-backdrop" :class="{ shown: a.filtersOpen }" aria-hidden="true" @click="a.filtersOpen = false" />
  <div v-if="a" class="filters-wrap flex" :class="{ shown: a.filtersOpen, 'is-sticky': d.sticky !== false }" @pointerdown.stop>
    <q-scroll-area class="fit">
      <div class="sticky filters-drawer-header flex justify-between q-mb-md">
        <div class="text-h6" :class="headingText.class" :style="headingText.style">{{ d.title || t('Filters') }}</div>
        <q-btn class="filters-close" :icon="matClose" flat dense :aria-label="t('Close filters drawer')" @click="a.filtersOpen = false" />
      </div>

      <div v-if="d.show_search !== false" class="q-mb-md">
        <q-input v-model="a.search" filled :label="t('Search products...')" debounce="300" />
      </div>

      <template v-if="a.mode === 'shop' && d.show_categories !== false">
        <div v-if="!a.isHydrated && !a.categoryOptions.length" class="filters-inner-wrap">
          <q-skeleton type="rect" class="q-mb-md" />
        </div>
        <q-card v-else-if="a.categoryOptions.length" class="filters-inner-wrap q-pa-md q-mb-md">
          <div class="text-subtitle1 q-mb-sm">{{ t('Filter by Category') }}</div>
          <q-option-group v-model="a.selectedCategory" :options="a.categoryOptions" type="checkbox" color="secondary" />
        </q-card>
      </template>

      <PriceFilterCard v-if="d.show_price !== false" v-model="a.priceRange" :min="a.priceMin" :max="a.priceMax" @change="a.onPriceChange" />
    </q-scroll-area>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { matClose } from '@quasar/extras/material-icons'
import PriceFilterCard from 'components/shop/PriceFilterCard.vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

/**
 * "Filters" (All products / category page template): search, categories
 * (All products only) and price. A drawer on phones, opened by the Sort
 * block's "Filters" button.
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const a = inject('productArchive', null)
const d = computed(() => props.data.data || {})
const headingText = computed(() => textStyle(d.value, tsKeys('heading')))
</script>

<style scoped>
.filters-wrap {
  width: 100%;
  row-gap: 25px;
  flex-direction: column;
  flex-wrap: nowrap;
  height: 70vh;
}
.filters-wrap.is-sticky { position: sticky; top: 70px; }
.sticky.filters-drawer-header {
  position: sticky;
  top: 0;
  background: #ffffff;
  z-index: 1;
  width: 100%;
  box-shadow: 0 0 15px #00000011;
}
.filters-close { display: none; }
.filters-backdrop { display: none; }
:deep(.q-checkbox[aria-checked="true"] .q-checkbox__label) { font-weight: 600; }

@media (max-width: 767px) {
  .filters-wrap,
  .filters-wrap.is-sticky {
    position: fixed;
    top: 0;
    left: 0;
    padding: 10px;
    z-index: 9999;
    height: 100dvh;
    background: var(--q-primary);
    width: 85%;
    box-shadow: 0 0 50px #00000050;
    opacity: 0;
    pointer-events: none;
    visibility: hidden;
    transform: translateX(-100%);
    transition: 0.3s ease;
  }
  /* [dir] matches the direction-specific rules postcss-rtlcss makes from the closed state. */
  [dir] .filters-wrap.shown {
    transform: translateX(0);
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
  .filters-close { display: inline-flex; }
  .filters-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 9998;
    background: rgba(0, 0, 0, 0.35);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }
  .filters-backdrop.shown { opacity: 1; pointer-events: auto; }
}
</style>
