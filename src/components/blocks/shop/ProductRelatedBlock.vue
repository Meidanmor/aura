<template>
  <!-- Nothing at all (no heading either) when the store has no other product to show. -->
  <div v-if="items.length" class="product-related" :style="vars">
    <h2 v-if="d.show_title !== false" class="product-related__title text-h5" :class="titleText.class" :style="titleText.style">
      {{ d.title || t('Related Products') }}
    </h2>
    <CarouselBlock v-if="display === 'carousel'" :data="carouselData" :block-id="blockId" :products="items" />
    <div v-else class="product-related__grid">
      <div v-for="item in items" :key="item.id" class="product-related__item">
        <LoopCard v-if="card" :sections="card" type="product" :item="item" />
        <ProductCard v-else :product="item" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import CarouselBlock from 'components/blocks/CarouselBlock.vue'
import LoopCard from 'components/loops/LoopCard.vue'
import ProductCard from 'components/shop/ProductCard.vue'
import productsStore from 'src/stores/products'
import { useBlockQuery } from 'src/composables/useBlockQuery.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { alignToText, setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'
import { useI18n } from 'src/i18n/index.js'

/**
 * "Related Products" (product page template): others from the product's first
 * category (else the newest), as a carousel with every Carousel block option,
 * or as a grid. Found on the server too, so they're in the page's HTML.
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const { t } = useI18n()
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const display = computed(() => (d.value.display === 'grid' ? 'grid' : 'carousel'))
const card = computed(() => (Array.isArray(d.value.card) && d.value.card.length ? d.value.card : null))
const carouselData = computed(() => ({ data: { ...d.value, source: 'products' } }))
const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))

const limit = computed(() => Math.max(1, Math.min(24, Number(d.value.limit) || 8)))
const productId = computed(() => p?.product?.id || 0)
const categoryId = computed(() => p?.product?.categories?.[0]?.id || 0)

async function findRelated(ssrContext) {
  const id = productId.value
  if (!id) return []
  const others = (list) => (Array.isArray(list) ? list : []).filter((x) => x.id !== id)
  let list = categoryId.value
    ? others(await productsStore.queryProducts({ query_type: 'category', category_ids: [categoryId.value], limit: limit.value + 1, hide_out_of_stock: !!d.value.hide_out_of_stock }, ssrContext))
    : []
  if (!list.length) {
    list = others(await productsStore.queryProducts({ query_type: 'newest', limit: limit.value + 1, hide_out_of_stock: true }, ssrContext))
  }
  return list.slice(0, limit.value)
}

// Keyed by the product too: the server's answer belongs to the product it rendered.
const { data: found } = useBlockQuery(
  `${props.blockId}:related:${productId.value}`,
  () => JSON.stringify([productId.value, categoryId.value, limit.value, !!d.value.hide_out_of_stock]),
  findRelated,
)
const items = computed(() => found.value || [])

const vars = computed(() => {
  const v = {}
  setResponsiveVar(v, '--pr-ta', d.value.title_align ?? 'center', alignToText)
  setResponsiveVar(v, '--pr-cols', d.value.items_per_view ?? { desktop: 4, tablet: 3, mobile: 2 }, (n) => (Number(n) > 0 ? String(Math.min(8, Number(n))) : ''))
  setResponsiveVar(v, '--pr-gap', d.value.gap, toCssLength)
  return v
})
</script>

<style scoped>
.product-related__title { margin: 0 0 16px; text-align: var(--pr-ta, center); }
.product-related__grid { display: grid; grid-template-columns: repeat(var(--pr-cols, 4), minmax(0, 1fr)); gap: var(--pr-gap, 16px); }
@media (max-width: 1023px) {
  .product-related__title { text-align: var(--pr-ta-t, var(--pr-ta, center)); }
  .product-related__grid { grid-template-columns: repeat(var(--pr-cols-t, var(--pr-cols, 3)), minmax(0, 1fr)); gap: var(--pr-gap-t, var(--pr-gap, 16px)); }
}
@media (max-width: 767px) {
  .product-related__title { text-align: var(--pr-ta-m, var(--pr-ta-t, var(--pr-ta, center))); }
  .product-related__grid { grid-template-columns: repeat(var(--pr-cols-m, var(--pr-cols-t, var(--pr-cols, 2))), minmax(0, 1fr)); gap: var(--pr-gap-m, var(--pr-gap-t, var(--pr-gap, 16px))); }
}
</style>
