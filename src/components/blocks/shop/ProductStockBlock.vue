<template>
  <div v-if="note" class="product-stock" :class="[`is-${note.kind}`, text.class]" :style="[text.style, note.kind === 'low' && lowColor ? { color: lowColor } : null]">{{ note.text }}</div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { useI18n } from 'src/i18n/index.js'
import { giftSettings } from 'src/utils/gift-card.js'

/** "Stock Note" (product page template): "Only 3 left in stock!" or "Out of stock". */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const { t } = useI18n()
const d = computed(() => props.data.data || {})
const text = computed(() => textStyle(d.value, tsKeys('text')))
const lowColor = computed(() => resolveGlobalColor(d.value.low_color))
const lowAt = computed(() => (d.value.low_at === undefined || d.value.low_at === '' || d.value.low_at === null ? 10 : Number(d.value.low_at)))
const note = computed(() => {
  const product = p?.product
  if (!product || product.status === 'draft') return null
  if (giftSettings(product)) return null // a gift card has no stock (its cart limit of 1 isn't stock)
  if (!product.is_in_stock) return { kind: 'out', text: t('Out of stock') }
  // "Sold one per order" also caps the cart's maximum at 1: read the stock left instead.
  const max = product.sold_individually ? Number(product.low_stock_remaining) : Number(product.add_to_cart?.maximum)
  if (!max || !lowAt.value || max >= lowAt.value) return null
  return { kind: 'low', text: max === 1 ? t('Only 1 left in stock!') : t('Only {n} left in stock!', { n: max }) }
})
</script>

<style scoped>
.product-stock.is-low { color: red; }
</style>
