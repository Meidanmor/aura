<template>
  <div v-if="chips.length" class="lt-align lt-attr-wrap" :class="dirClasses" :style="alignVars">
    <span v-for="c in chips" :key="c.key" class="lt-attr" :class="textBind.class" :style="[textBind.style, chipVars]">
      <template v-if="d.show_name !== false">{{ c.name }}{{ separator }}</template>{{ c.value }}
    </span>
  </div>
</template>

<script setup>
/**
 * "Product Detail" on a product card (lp_attribute): the chosen details
 * (attributes), each as its own small chip, e.g. "Cable length: 6 m", side by
 * side or one under the other. A detail the product doesn't have is skipped.
 */
import { computed } from 'vue'
import { useLoopItem } from './loop-item.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { alignToFlex, alignToText, asResponsive, setResponsiveVar, toCssLength, DEVICES } from 'src/composables/useSectionStyle.js'
import { detailKeys, pickDetails } from 'src/utils/product-details.js'

const props = defineProps({ data: { type: Object, required: true } })
const loop = useLoopItem()
const d = computed(() => props.data.data || {})
const chips = computed(() => {
  const item = loop?.value?.type === 'product' ? loop.value.item : null
  if (!item) return []
  return pickDetails(item.attributes, detailKeys(d.value.attribute))
    .map((a) => ({ key: a.taxonomy || a.name, name: a.name, value: (a.terms || []).map((t) => t.name).join(', ') }))
    .filter((c) => c.value)
})
// The saved separator loses its trailing space: one goes after it again.
const separator = computed(() => { const s = String(d.value.separator ?? ':').trim(); return s ? `${s} ` : ' ' })
const textBind = computed(() => textStyle(d.value, tsKeys('text')))
const alignVars = computed(() => {
  const v = {}
  setResponsiveVar(v, '--lt-ta', d.value.align, alignToText)
  setResponsiveVar(v, '--lt-jc', d.value.align, alignToFlex)
  setResponsiveVar(v, '--lt-cg', d.value.chip_gap, toCssLength)
  return v
})
// Chips: side by side (wrapping) or one under the other, per screen size; empty = the bigger size's.
const SHORT = { desktop: 'd', tablet: 't', mobile: 'm' }
const dirClasses = computed(() => {
  const r = asResponsive(d.value.direction || 'row')
  const c = {}
  let last = 'row'
  for (const device of DEVICES) {
    last = r[device] === 'column' || r[device] === 'row' ? r[device] : last
    c[`lt-attr-${last}-${SHORT[device]}`] = true
  }
  return c
})
const chipVars = computed(() => {
  const v = {}
  const bg = resolveGlobalColor(d.value.chip_bg)
  if (bg) v.background = bg
  const border = resolveGlobalColor(d.value.chip_border)
  if (border) v.border = `1px solid ${border}`
  const r = toCssLength(d.value.chip_radius)
  if (r) v['border-radius'] = r
  const pad = String(d.value.chip_padding || '').trim()
  if (/^[\d.\s]+(px|em|rem)?(\s+[\d.]+(px|em|rem)?){0,3}$/.test(pad)) v.padding = pad.replace(/(\d)(?=\s|$)/g, '$1px')
  return v
})
</script>

<style scoped>
.lt-attr-wrap { display: flex; flex-wrap: wrap; gap: var(--lt-cg, 6px); justify-content: var(--lt-jc, flex-start); }
@media (min-width: 1024px) {
  .lt-attr-column-d { flex-direction: column; align-items: var(--lt-jc, flex-start); }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .lt-attr-wrap { gap: var(--lt-cg-t, var(--lt-cg, 6px)); justify-content: var(--lt-jc-t, var(--lt-jc, flex-start)); }
  .lt-attr-column-t { flex-direction: column; align-items: var(--lt-jc-t, var(--lt-jc, flex-start)); }
}
@media (max-width: 767px) {
  .lt-attr-wrap { gap: var(--lt-cg-m, var(--lt-cg-t, var(--lt-cg, 6px))); justify-content: var(--lt-jc-m, var(--lt-jc-t, var(--lt-jc, flex-start))); }
  .lt-attr-column-m { flex-direction: column; align-items: var(--lt-jc-m, var(--lt-jc-t, var(--lt-jc, flex-start))); }
}
.lt-attr { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; line-height: 1.5; background: rgba(0, 0, 0, .05); }
</style>
