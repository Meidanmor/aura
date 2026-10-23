<template>
  <!-- eslint-disable-next-line vue/no-v-html -- the store's price HTML, sanitized -->
  <div v-if="price" class="lt-price lt-align" :class="[priceBind.class, { 'lt-price--no-old': d.show_old === false }]" :style="[priceBind.style, vars]" v-html="price" />
</template>

<script setup>
/**
 * A product card's price (lp_price): the store's price (a range for products
 * with options, or only their lowest price: "Products With Options Show"), and
 * the old price when on sale unless it's turned off.
 * Styles: LoopCard.vue.
 */
import { computed } from 'vue'
import { t } from 'src/i18n/index.js'
import { useLoopItem } from './loop-item.js'
import { useSanitizedPrice } from 'src/composables/useSanitizedHtml.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { alignToText, setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'
import { brandFontVar } from 'src/utils/brand-fonts.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'

const props = defineProps({
  data: { type: Object, required: true },
})
const loop = useLoopItem()
const d = computed(() => props.data.data || {})
const storePrice = useSanitizedPrice(() => (loop?.value?.type === 'product' ? loop.value.item?.price_html || '' : ''))

// The lowest price as the store writes prices (no locale formatting: the server and browser must match).
function formatAmount(prices, minor) {
  const unit = Number(prices.currency_minor_unit) || 0
  const n = Number(minor) / 10 ** unit
  if (!Number.isFinite(n)) return ''
  const [whole, frac] = n.toFixed(unit).split('.')
  const grouped = whole.replace(/B(?=(d{3})+(?!d))/g, prices.currency_thousand_separator ?? ',')
  const num = frac ? `${grouped}${prices.currency_decimal_separator ?? '.'}${frac}` : grouped
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  return `<span class="lt-price__amount">${esc(prices.currency_prefix)}${num}${esc(prices.currency_suffix)}</span>`
}
const price = computed(() => {
  const item = loop?.value?.type === 'product' ? loop.value.item : null
  const mode = d.value.variable_price
  const prices = item?.prices
  const range = prices?.price_range
  if (!item || !prices || !range || !['from', 'lowest'].includes(mode) || range.min_amount === range.max_amount) return storePrice.value
  const low = formatAmount(prices, range.min_amount)
  if (!low) return storePrice.value
  return mode === 'from' ? t('From {price}', { price: low }) : low
})
const priceBind = computed(() => textStyle(d.value, tsKeys('price')))
const vars = computed(() => {
  const v = {}
  setResponsiveVar(v, '--lt-ta', d.value.align, alignToText)
  if (d.value.old_font) v['--lt-old-font'] = brandFontVar(d.value.old_font, 'text')
  const size = d.value.old_size && typeof d.value.old_size === 'object' ? d.value.old_size.desktop : d.value.old_size
  if (toCssLength(size)) v['--lt-old-size'] = toCssLength(size)
  const color = resolveGlobalColor(d.value.old_color)
  if (color) v['--lt-old-color'] = color
  return v
})
</script>
