<template>
  <div class="product-grid-block" :style="cssVars">
    <div v-if="products?.length" class="product-grid-block__grid">
      <div v-for="product in products" :key="product.id" class="product-grid-block__cell">
        <ProductCard :product="product" />
      </div>
    </div>
    <div v-if="d.show_view_all && d.view_all_url && products?.length" class="product-grid-block__footer">
      <q-btn
          :to="isInternal(d.view_all_url) ? d.view_all_url : undefined"
          :href="isInternal(d.view_all_url) ? undefined : d.view_all_url"
          :label="d.view_all_text || 'View all'"
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
import productsStore from 'src/stores/products'
import { useBlockQuery } from 'src/composables/useBlockQuery.js'
import { setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})

const d = computed(() => props.data.data || {})
const isInternal = (url) => String(url).startsWith('/') && !String(url).startsWith('//')

// Everything that changes which products are shown.
const queryKey = () => JSON.stringify([
  d.value.query_type, d.value.category_ids, d.value.tag_ids, d.value.product_ids, d.value.limit, d.value.hide_out_of_stock,
])

const { data: products } = useBlockQuery(props.blockId, queryKey, (ssrContext) =>
    productsStore.queryProducts(d.value, ssrContext)
)

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
  .product-grid-block__grid { grid-template-columns: repeat(var(--pg-cols-t, 3), minmax(0, 1fr)); gap: var(--pg-gap-t, 16px); }
}
@media (max-width: 767px) {
  .product-grid-block__grid { grid-template-columns: repeat(var(--pg-cols-m, 2), minmax(0, 1fr)); gap: var(--pg-gap-m, 12px); }
}
</style>
