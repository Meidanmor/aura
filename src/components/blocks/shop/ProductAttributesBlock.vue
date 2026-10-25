<template>
  <div v-if="rows.length" class="product-attrs-wrap">
    <component :is="'h2'" v-if="d.title" class="product-attrs__title" :class="titleText.class" :style="titleText.style">{{ d.title }}</component>
    <table v-if="layout === 'table'" class="product-attrs product-attrs--table" :style="vars">
      <tbody>
        <tr v-for="row in rows" :key="row.name" class="product-attrs__row">
          <th scope="row" :class="nameText.class" :style="nameText.style">{{ row.name }}</th>
          <td :class="valueText.class" :style="valueText.style">{{ row.value }}</td>
        </tr>
      </tbody>
    </table>
    <dl v-else class="product-attrs" :class="[`product-attrs--${layout}`, { 'has-lines': d.dividers !== false && layout !== 'cards' }]" :style="vars">
      <div v-for="row in rows" :key="row.name" class="product-attrs__row">
        <dt :class="nameText.class" :style="nameText.style">{{ row.name }}</dt>
        <dd :class="valueText.class" :style="valueText.style">{{ row.value }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'
import { detailKeys, pickDetails } from 'src/utils/product-details.js'

/**
 * "Product Details" (product page template): the product's attributes (e.g. Taste:
 * Smoky, sweet) as name / value rows, name above value, cards in a grid or a table.
 * "Show Only These Details" picks some, in that order. The options shoppers choose
 * (sizes) only when asked for. Nothing when the product has none.
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const LAYOUTS = new Set(['rows', 'stacked', 'cards', 'table'])
const layout = computed(() => (LAYOUTS.has(d.value.layout) ? d.value.layout : 'rows'))
const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))
const nameText = computed(() => textStyle(d.value, tsKeys('name')))
const valueText = computed(() => textStyle(d.value, tsKeys('value')))

const only = computed(() => detailKeys(d.value.only))
const rows = computed(() => {
  const attrs = (p?.product?.attributes || []).filter((a) => d.value.show_options || !a.has_variations)
  return (only.value.length ? pickDetails(attrs, only.value) : attrs)
    .map((a) => ({ name: a.name, value: (a.terms || []).map((t) => t.name).join(', ') }))
    .filter((r) => r.name && r.value)
})

const vars = computed(() => {
  const v = {}
  setResponsiveVar(v, '--pa-gap', d.value.gap, toCssLength)
  setResponsiveVar(v, '--pa-cols', d.value.columns, (n) => (Number(n) > 0 ? String(Math.min(6, Number(n))) : ''))
  const map = { divider_color: '--pa-line', card_bg: '--pa-bg', stripe_bg: '--pa-stripe', card_border: '--pa-border' }
  for (const [key, css] of Object.entries(map)) {
    const c = resolveGlobalColor(d.value[key])
    if (c) v[css] = c
  }
  const r = toCssLength(d.value.card_radius)
  if (r) v['--pa-radius'] = r
  return v
})
</script>

<style scoped>
.product-attrs__title { margin: 0 0 16px; font-size: 1.5em; line-height: 1.25; }
.product-attrs { margin: 0; display: grid; }
.product-attrs__row { display: grid; grid-template-columns: minmax(80px, max-content) 1fr; gap: 4px 18px; padding: var(--pa-gap, 10px) 0; }
.product-attrs--stacked .product-attrs__row { grid-template-columns: 1fr; }
.has-lines .product-attrs__row + .product-attrs__row { border-top: 1px solid var(--pa-line, rgba(0, 0, 0, .12)); }
.product-attrs dt, .product-attrs th { opacity: .7; }
.product-attrs dd { margin: 0; font-weight: 600; }
@media (max-width: 1023px) { .product-attrs__row { padding: var(--pa-gap-t, var(--pa-gap, 10px)) 0; } }
@media (max-width: 767px) { .product-attrs__row { padding: var(--pa-gap-m, var(--pa-gap-t, var(--pa-gap, 10px))) 0; } }

/* Cards in a grid: name small above, value bold. */
.product-attrs--cards { grid-template-columns: repeat(var(--pa-cols, 2), minmax(0, 1fr)); gap: var(--pa-gap, 10px); }
.product-attrs--cards .product-attrs__row {
  grid-template-columns: 1fr; gap: 2px; padding: 12px 14px;
  background: var(--pa-bg, rgba(0, 0, 0, .03)); border: 1px solid var(--pa-border, transparent); border-radius: var(--pa-radius, 12px);
}
.product-attrs--cards dt { font-size: .85em; }
@media (max-width: 1023px) {
  .product-attrs--cards { grid-template-columns: repeat(var(--pa-cols-t, var(--pa-cols, 2)), minmax(0, 1fr)); gap: var(--pa-gap-t, var(--pa-gap, 10px)); }
  .product-attrs--cards .product-attrs__row { padding: 12px 14px; }
}
@media (max-width: 767px) {
  .product-attrs--cards { grid-template-columns: repeat(var(--pa-cols-m, var(--pa-cols-t, var(--pa-cols, 2))), minmax(0, 1fr)); gap: var(--pa-gap-m, var(--pa-gap-t, var(--pa-gap, 10px))); }
  .product-attrs--cards .product-attrs__row { padding: 10px 12px; }
}

/* A table: a border around, rows striped. */
.product-attrs--table { display: table; width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid var(--pa-border, rgba(0, 0, 0, .12)); border-radius: var(--pa-radius, 12px); overflow: hidden; background: var(--pa-bg, transparent); }
.product-attrs--table .product-attrs__row { display: table-row; padding: 0; }
.product-attrs--table th, .product-attrs--table td { padding: 12px 16px; text-align: start; vertical-align: top; }
.product-attrs--table th { font-weight: 400; width: 40%; }
.product-attrs--table td { font-weight: 600; }
.product-attrs--table .product-attrs__row:nth-child(even) { background: var(--pa-stripe, rgba(0, 0, 0, .035)); }
.product-attrs--table .product-attrs__row + .product-attrs__row > * { border-top: 1px solid var(--pa-line, rgba(0, 0, 0, .08)); }
</style>
