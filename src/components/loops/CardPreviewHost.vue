<template>
  <!-- Store builder → Loop templates: the card being edited, shown over the page in the live preview. -->
  <div v-if="card" class="card-preview" role="region" :aria-label="t('Card preview')">
    <p class="card-preview__note">{{ note }}</p>
    <div class="card-preview__grid">
      <div v-for="(item, i) in items" :key="i" class="card-preview__cell">
        <LoopCard :sections="card.sections" :type="card.type" :item="item" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import LoopCard from './LoopCard.vue'
import productsStore from 'src/stores/products'
import { isEditorMode, subscribeToLiveConfig } from 'src/utils/config-loader.js'
import { samplesOf } from 'src/utils/sample-items.js'
import { t } from 'src/i18n/index.js'

/**
 * Only in the Store builder's live preview: the dashboard sends the card design being edited
 * as `preview_card` { id, type, sections } (null when another tab is open). Product cards use the
 * store's newest products, else sample ones; the other kinds use samples.
 */
const card = ref(null)
const products = ref(null)
let stop = () => {}

async function loadProducts() {
  if (products.value) return
  try {
    products.value = (await productsStore.queryProducts({ query_type: 'newest', limit: 4 })) || []
  } catch {
    products.value = []
  }
}

const items = computed(() => {
  if (!card.value) return []
  if (card.value.type === 'product' && products.value?.length) return products.value
  return samplesOf(card.value.type, card.value.type === 'post' || card.value.type === 'review' ? 3 : 4)
})
const note = computed(() => (card.value?.type === 'product' && products.value?.length
  ? t('Card preview: your newest products.')
  : t('Card preview with sample items. Your own items show here once you add them.')))

onMounted(() => {
  if (!isEditorMode()) return
  stop = subscribeToLiveConfig('preview_card', (c) => {
    card.value = c && Array.isArray(c.sections) && c.sections.length && c.type ? c : null
    if (card.value?.type === 'product') loadProducts()
  })
})
onUnmounted(() => stop())
</script>

<style scoped>
.card-preview { position: fixed; inset: 0; z-index: 3000; overflow-y: auto; padding: 24px 16px 48px; background: var(--q-primary, #fff); }
.card-preview__note { max-width: 1200px; margin: 0 auto 16px; font-size: 13px; opacity: .7; }
.card-preview__grid { max-width: 1200px; margin: 0 auto; display: grid; gap: 24px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
@media (max-width: 1023px) { .card-preview__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 599px) { .card-preview__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; } }
</style>
