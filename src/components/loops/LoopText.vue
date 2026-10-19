<template>
  <component :is="tag" v-if="text" class="lt-text lt-align" :class="[textBind.class, { 'lt-text--clamp': lines > 0 }]" :style="[textBind.style, alignVars, lines > 0 ? { '--lt-lines': lines } : null]">
    <component :is="isInternal ? RouterLink : 'a'" v-if="link" v-bind="isInternal ? { to: link } : { href: link, rel: 'noopener' }">{{ text }}</component>
    <template v-else>{{ text }}</template>
  </component>
</template>

<script setup>
/**
 * A card's text (name, summary, date, category, count, a review's text,
 * name, "Verified buyer" label or product link): its HTML tag, alignment,
 * a cut after some lines, and its text style. Styles: LoopCard.vue.
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useLoopItem, loopText } from './loop-item.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { alignToText, setResponsiveVar } from 'src/composables/useSectionStyle.js'

const props = defineProps({
  data: { type: Object, required: true },
})
const loop = useLoopItem()
const d = computed(() => props.data.data || {})
const TAGS = new Set(['h2', 'h3', 'h4', 'p', 'div'])
const tag = computed(() => (TAGS.has(d.value.tag) ? d.value.tag : 'p'))
const text = computed(() => (loop?.value ? loopText(props.data.type, loop.value.item, d.value) : ''))
const lines = computed(() => Math.max(0, Math.min(6, Number(d.value.max_lines) || 0)))
const HEADINGS = new Set(['lp_title', 'lc_name', 'lpo_title'])
const textBind = computed(() => textStyle(d.value, tsKeys('text'), HEADINGS.has(props.data.type) ? 'headings' : 'text'))
const alignVars = computed(() => {
  const v = {}
  setResponsiveVar(v, '--lt-ta', d.value.align, alignToText)
  return v
})

// A review's product link (a site path or a web address the owner typed).
const link = computed(() => {
  if (props.data.type !== 'lr_product') return ''
  const url = String(loop?.value?.item?.product_url || '').trim()
  return (url.startsWith('/') && !url.startsWith('//')) || /^https?:\/\//i.test(url) ? url : ''
})
const isInternal = computed(() => link.value.startsWith('/'))
</script>
