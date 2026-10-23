<template>
  <dl v-if="rows.length" class="product-attrs" :class="[`product-attrs--${layout}`, { 'has-lines': d.dividers !== false }]" :style="vars">
    <div v-for="row in rows" :key="row.name" class="product-attrs__row">
      <dt :class="nameText.class" :style="nameText.style">{{ row.name }}</dt>
      <dd :class="valueText.class" :style="valueText.style">{{ row.value }}</dd>
    </div>
  </dl>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'

/**
 * "Product Details" (product page template): the product's attributes as name / value rows
 * (e.g. Taste: Smoky, sweet). The options shoppers choose (sizes) only when asked for.
 * Nothing when the product has none.
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const layout = computed(() => (d.value.layout === 'stacked' ? 'stacked' : 'rows'))
const nameText = computed(() => textStyle(d.value, tsKeys('name')))
const valueText = computed(() => textStyle(d.value, tsKeys('value')))

const rows = computed(() => (p?.product?.attributes || [])
  .filter((a) => d.value.show_options || !a.has_variations)
  .map((a) => ({ name: a.name, value: (a.terms || []).map((t) => t.name).join(', ') }))
  .filter((r) => r.name && r.value))

const vars = computed(() => {
  const v = {}
  setResponsiveVar(v, '--pa-gap', d.value.gap, toCssLength)
  const line = resolveGlobalColor(d.value.divider_color)
  if (line) v['--pa-line'] = line
  return v
})
</script>

<style scoped>
.product-attrs { margin: 0; display: grid; }
.product-attrs__row { display: grid; grid-template-columns: minmax(80px, max-content) 1fr; gap: 4px 18px; padding: var(--pa-gap, 10px) 0; }
.product-attrs--stacked .product-attrs__row { grid-template-columns: 1fr; }
.has-lines .product-attrs__row + .product-attrs__row { border-top: 1px solid var(--pa-line, rgba(0, 0, 0, .12)); }
.product-attrs dt { opacity: .7; }
.product-attrs dd { margin: 0; font-weight: 600; }
@media (max-width: 1023px) { .product-attrs__row { padding: var(--pa-gap-t, var(--pa-gap, 10px)) 0; } }
@media (max-width: 767px) { .product-attrs__row { padding: var(--pa-gap-m, var(--pa-gap-t, var(--pa-gap, 10px))) 0; } }
</style>
