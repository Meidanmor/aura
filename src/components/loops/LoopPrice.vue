<template>
  <!-- eslint-disable-next-line vue/no-v-html -- the store's price HTML, sanitized -->
  <div v-if="price" class="lt-price lt-align" :class="[priceBind.class, { 'lt-price--no-old': d.show_old === false }]" :style="[priceBind.style, vars]" v-html="price" />
</template>

<script setup>
/**
 * A product card's price (lp_price): the store's price (a range for products
 * with options), and the old price when on sale unless it's turned off.
 * Styles: LoopCard.vue.
 */
import { computed } from 'vue'
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
const price = useSanitizedPrice(() => (loop?.value?.type === 'product' ? loop.value.item?.price_html || '' : ''))
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
