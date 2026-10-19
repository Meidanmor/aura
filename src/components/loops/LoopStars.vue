<template>
  <div v-if="show" class="lt-align" :style="vars">
    <span class="lt-stars" role="img" :aria-label="t('Rated {rating} out of 5', { rating: rating.toFixed(1) })">
      <span class="lt-stars__row" aria-hidden="true">★★★★★<span class="lt-stars__fill" :style="{ width: `${(rating / 5) * 100}%` }">★★★★★</span></span>
      <span v-if="count !== null" class="lt-stars__count">({{ count }})</span>
    </span>
  </div>
</template>

<script setup>
/**
 * Stars on a card: a product's average rating (lp_rating, hidden while it
 * has no reviews) or a review's own stars (lr_stars). Styles: LoopCard.vue.
 */
import { computed } from 'vue'
import { useLoopItem } from './loop-item.js'
import { setResponsiveVar, toCssLength, alignToText } from 'src/composables/useSectionStyle.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'

const props = defineProps({
  data: { type: Object, required: true },
})
const loop = useLoopItem()
const d = computed(() => props.data.data || {})
const item = computed(() => loop?.value?.item || null)
const isProduct = computed(() => props.data.type === 'lp_rating')
const rating = computed(() => {
  const r = Number(isProduct.value ? item.value?.average_rating : item.value?.rating)
  return Number.isFinite(r) ? Math.max(0, Math.min(5, r)) : 0
})
const count = computed(() => (isProduct.value && d.value.show_count !== false ? Number(item.value?.review_count) || 0 : null))
const show = computed(() => !!item.value && rating.value > 0)
const vars = computed(() => {
  const v = {}
  setResponsiveVar(v, '--lt-ta', d.value.align, alignToText)
  setResponsiveVar(v, '--lt-star', d.value.star_size, toCssLength)
  const color = resolveGlobalColor(d.value.star_color)
  if (color) v['--lt-star-color'] = color
  return v
})
</script>
