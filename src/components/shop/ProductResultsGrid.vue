<!-- src/components/shop/ProductResultsGrid.vue -->
<template>
  <div v-if="loading" class="products-grid" :style="vars">
    <q-card v-for="n in 6" :key="'skeleton-' + n" class="my-card full-height">
      <q-skeleton height="250px" square />
      <q-card-section>
        <q-skeleton type="text" width="70%" />
        <q-skeleton type="text" width="40%" />
      </q-card-section>
      <q-card-actions class="q-gutter-sm">
        <q-skeleton type="rect" width="100px" height="36px" />
        <q-skeleton type="rect" width="70px" height="36px" />
      </q-card-actions>
    </q-card>
  </div>

  <div v-else-if="products.length" class="products-grid" :style="vars">
    <template v-for="(product, index) in products" :key="product.id">
      <div v-if="promoAt === index" class="products-grid__item products-grid__promo"><slot name="promo" /></div>
      <div class="products-grid__item relative-position">
        <LoopCard v-if="card?.length" :sections="card" type="product" :item="product" :priority="index < priorityCount" />
        <ProductCard v-else :product="product" :priority="index < priorityCount" :eager="index < 3" />
      </div>
    </template>
    <div v-if="promoAt >= products.length" class="products-grid__item products-grid__promo"><slot name="promo" /></div>
  </div>

  <div v-else class="text-center q-mt-lg">{{ emptyText || t('No products found') }}</div>
</template>

<script setup>
import { computed } from 'vue'
import ProductCard from './ProductCard.vue'
import LoopCard from '../loops/LoopCard.vue'
import { setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'
// priorityCount: 0 when a section above the grid holds the page's first image (it loads first).
// card: the product card design for these pages (shop.json / category.json product_card).
// emptyText: the Products Grid block's own "nothing found" text.
// columns / gap: per screen size (the Products Grid block's fields); 3 / 2 / 2 and 16px when not set.
// promoAt: the promo card (slot "promo") comes before this product (-1: none; the end when past the list).
const props = defineProps({
  loading: Boolean, products: { type: Array, default: () => [] }, priorityCount: { type: Number, default: 3 },
  card: { type: Array, default: null }, emptyText: { type: String, default: '' },
  columns: { type: [Object, Number, String], default: null }, gap: { type: [Object, String], default: null },
  promoAt: { type: Number, default: -1 },
})
const vars = computed(() => {
  const v = {}
  setResponsiveVar(v, '--pg-cols', props.columns, (x) => (x ? Math.max(1, Math.min(6, Number(x) || 1)) : null))
  setResponsiveVar(v, '--pg-gap', props.gap, toCssLength)
  return v
})
</script>

<style scoped>
/* No padding or margin of its own: the block's Inner Padding and Margin are the owner's. */
.products-grid {
  display: grid;
  grid-template-columns: repeat(var(--pg-cols, 3), minmax(0, 1fr));
  gap: var(--pg-gap, 16px);
}
.products-grid > :deep(.q-card), .products-grid__item > :deep(.q-card) { display: flex; flex-direction: column; justify-content: flex-start; }
@media (max-width: 1023px) {
  .products-grid { grid-template-columns: repeat(var(--pg-cols-t, 2), minmax(0, 1fr)); gap: var(--pg-gap-t, 16px); }
}
@media (max-width: 767px) {
  .products-grid { grid-template-columns: repeat(var(--pg-cols-m, 2), minmax(0, 1fr)); gap: var(--pg-gap-m, 16px); }
}
</style>
