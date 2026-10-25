<template>
  <div v-if="value" class="lt-align lt-attr-wrap" :style="alignVars">
    <span class="lt-attr" :class="textBind.class" :style="[textBind.style, chipVars]">
      <template v-if="d.show_name !== false">{{ attr.name }}{{ separator }}</template>{{ value }}
    </span>
  </div>
</template>

<script setup>
/**
 * "Product Detail" on a product card (lp_attribute): one of the product's
 * details (attributes), e.g. "Cable length: 6 m", as a small chip.
 * Nothing when the product doesn't have that detail.
 */
import { computed } from 'vue'
import { useLoopItem } from './loop-item.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { alignToText, setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'

const props = defineProps({ data: { type: Object, required: true } })
const loop = useLoopItem()
const d = computed(() => props.data.data || {})
const norm = (s) => String(s || '').trim().toLowerCase()
const attr = computed(() => {
  const want = norm(d.value.attribute)
  const item = loop?.value?.type === 'product' ? loop.value.item : null
  if (!want || !item) return null
  return (item.attributes || []).find((a) => norm(a.name) === want) || null
})
// The saved separator loses its trailing space: one goes after it again.
const separator = computed(() => { const s = String(d.value.separator ?? ':').trim(); return s ? `${s} ` : ' ' })
const value = computed(() => (attr.value?.terms || []).map((t) => t.name).join(', '))
const textBind = computed(() => textStyle(d.value, tsKeys('text')))
const alignVars = computed(() => {
  const v = {}
  setResponsiveVar(v, '--lt-ta', d.value.align, alignToText)
  return v
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
.lt-attr { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; line-height: 1.5; background: rgba(0, 0, 0, .05); }
</style>
