<template>
  <div class="product-grid-block" :style="cssVars">
    <div v-if="shown?.length" class="product-grid-block__grid">
      <div v-for="(product, index) in shown" :key="product.id" class="product-grid-block__cell">
        <LoopCard v-if="card" :sections="card" type="product" :item="product" :priority="picked && index < 3" />
        <ProductCard v-else :product="product" :priority="picked && index < 3" />
      </div>
    </div>
    <div v-if="d.show_view_all && d.view_all_url && shown?.length" class="product-grid-block__footer">
      <q-btn
          :to="isInternal(d.view_all_url) ? d.view_all_url : undefined"
          :href="isInternal(d.view_all_url) ? undefined : d.view_all_url"
          :label="d.view_all_text || t('View all')"
          :aria-label="d.aria_label || undefined"
          outline
          no-caps
          class="product-grid-block__view-all"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ProductCard from '../shop/ProductCard.vue'
import LoopCard from '../loops/LoopCard.vue'
import productsStore from 'src/stores/products'
import { useBlockQuery } from 'src/composables/useBlockQuery.js'
import { keyWithProduct, useExcludedProduct } from 'src/utils/current-product.js'
import { usePriorityBlock } from 'src/composables/usePriorityBlock.js'
import { setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'
import { useSampleFallback } from 'src/utils/sample-items.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})

const d = computed(() => props.data.data || {})
// A card design chosen for this block (Store builder → Card designs), published with it.
const card = computed(() => (Array.isArray(props.data.data?.card) && props.data.data.card.length ? props.data.data.card : null))
const isInternal = (url) => String(url).startsWith('/') && !String(url).startsWith('//')

// On the product page template: the product being viewed is left out (unless turned off).
const excludeId = useExcludedProduct(() => d.value)

// Everything that changes which products are shown.
const queryKey = () => JSON.stringify([
  excludeId.value, d.value.query_type, d.value.category_ids, d.value.tag_ids, d.value.product_ids, d.value.limit, d.value.hide_out_of_stock,
])

// The page's first images (src/utils/priority-image.js): its first cards.
const picked = usePriorityBlock(props.blockId)

const { data: products } = useBlockQuery(keyWithProduct(props.blockId, excludeId.value), queryKey, (ssrContext) =>
    productsStore.queryProducts({ ...d.value, exclude_ids: excludeId.value ? [excludeId.value] : [] }, ssrContext)
)
// The Store builder preview of a store with no products yet: sample products.
const shown = useSampleFallback(() => products.value, 'product', Math.min(4, Number(d.value.limit) || 4))

const cssVars = computed(() => {
  const vars = {}
  setResponsiveVar(vars, '--pg-cols', d.value.columns || { desktop: 4, tablet: 3, mobile: 2 }, (v) => (v ? Math.max(1, Math.min(6, Number(v))) : null))
  setResponsiveVar(vars, '--pg-gap', d.value.gap, toCssLength)
  return vars
})
</script>

<style scoped>
.product-grid-block__grid {
  display: grid;
  grid-template-columns: repeat(var(--pg-cols, 4), minmax(0, 1fr));
  gap: var(--pg-gap, 16px);
}
.product-grid-block__cell { min-width: 0; }
.product-grid-block__footer { display: flex; justify-content: center; margin-top: 24px; }

@media (max-width: 1023px) {
  .product-grid-block__grid { grid-template-columns: repeat(var(--pg-cols-t, var(--pg-cols, 3)), minmax(0, 1fr)); gap: var(--pg-gap-t, var(--pg-gap, 16px)); }
}
@media (max-width: 767px) {
  .product-grid-block__grid { grid-template-columns: repeat(var(--pg-cols-m, var(--pg-cols-t, var(--pg-cols, 2))), minmax(0, 1fr)); gap: var(--pg-gap-m, var(--pg-gap-t, var(--pg-gap, 12px))); }
}
</style>
