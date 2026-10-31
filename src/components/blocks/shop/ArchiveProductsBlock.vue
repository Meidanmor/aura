<template>
  <div v-if="a" class="archive-products">
    <ProductResultsGrid
        :loading="a.productsStore.productsLoading.value"
        :products="shown"
        :priority-count="priorityCount"
        :card="card"
        :empty-text="d.empty_text || ''"
        :columns="d.columns"
        :gap="d.gap"
        :promo-at="promoAt"
    >
      <template #promo>
        <div class="ap-promo" :style="promoVars">
          <div class="ap-promo__text">
            <h3 v-if="d.promo_title" class="ap-promo__title">{{ d.promo_title }}</h3>
            <p v-if="d.promo_text" class="ap-promo__body">{{ d.promo_text }}</p>
          </div>
          <q-btn
              v-if="d.promo_button && d.promo_url"
              class="ap-promo__btn"
              v-bind="promoLink"
              :label="d.promo_button"
              unelevated
              no-caps
          />
        </div>
      </template>
    </ProductResultsGrid>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import ProductResultsGrid from 'components/shop/ProductResultsGrid.vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { toCssLength } from 'src/composables/useSectionStyle.js'
import { useSampleFallback } from 'src/utils/sample-items.js'

/**
 * "Products Grid" (All products / category page template): the products, with the chosen loop
 * template, and (Promo card) one card of the owner's own among them on the first page.
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const a = inject('productArchive', null)
const d = computed(() => props.data.data || {})
// The Store builder preview of a store with no products yet: sample products.
const withSamples = useSampleFallback(() => a?.paginatedProducts || [], 'product', 4)
const shown = computed(() => (a?.productsStore.productsLoading.value ? a.paginatedProducts : withSamples.value))
// The block's own loop template, else the one chosen for these pages.
const card = computed(() => (Array.isArray(d.value.card) && d.value.card.length ? d.value.card : a?.shopSettings?.product_card || null))
// The page's first image is above the grid (a section with a photo): it loads first, not the first cards.
const sbPriority = inject('sbPriority', null)
const priorityCount = computed(() => {
  const pr = sbPriority?.value
  return pr?.any && !pr.blocks?.has(props.blockId) ? 0 : 3
})

// Promo card: after product N (0 = before the first), first page only.
const promoAt = computed(() => {
  if (!d.value.promo || (!d.value.promo_title && !d.value.promo_text)) return -1
  if (Number(a?.currentPage || 1) !== 1) return -1
  return Math.max(0, Math.min(24, Number(d.value.promo_position) || 0))
})
const promoLink = computed(() => {
  const url = d.value.promo_url || ''
  return url.startsWith('/') && !url.startsWith('//') ? { to: url } : { href: url, type: 'a' }
})
const promoVars = computed(() => {
  const v = {}
  const set = (name, value) => { if (value) v[name] = value }
  set('--ap-bg', resolveGlobalColor(d.value.promo_bg))
  set('--ap-title', resolveGlobalColor(d.value.promo_title_color))
  set('--ap-text', resolveGlobalColor(d.value.promo_text_color))
  set('--ap-btn-bg', resolveGlobalColor(d.value.promo_button_bg))
  set('--ap-btn-text', resolveGlobalColor(d.value.promo_button_color))
  set('--ap-radius', toCssLength(d.value.promo_radius))
  const img = typeof d.value.promo_image === 'string' ? d.value.promo_image : d.value.promo_image?.url
  if (img && /^(https?:)?\/\//.test(img)) v['--ap-img'] = `url("${img.replace(/"/g, '%22')}")`
  return v
})
</script>

<style scoped>
.ap-promo {
  height: 100%;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;
  padding: 28px;
  border-radius: var(--ap-radius, 16px);
  background: var(--ap-img, none) center / cover no-repeat, var(--ap-bg, var(--q-secondary));
  color: var(--ap-text, #fff);
}
.ap-promo__title { margin: 0; font-size: 1.6em; line-height: 1.2; color: var(--ap-title, inherit); font-family: var(--qf-headings, var(--qf-default)); }
.ap-promo__body { margin: 10px 0 0; opacity: .9; }
.ap-promo__btn { align-self: flex-start; background: var(--ap-btn-bg, var(--q-primary)) !important; color: var(--ap-btn-text, var(--q-secondary)) !important; border-radius: 999px; padding: 8px 22px; font-weight: 700; }
@media (max-width: 767px) {
  .ap-promo { padding: 20px; min-height: 0; }
  .ap-promo__btn { align-self: stretch; }
}
</style>
