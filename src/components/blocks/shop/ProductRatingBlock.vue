<template>
  <a v-if="p?.reviewsOn && p.product?.review_count" href="#reviews" class="product-rating" :class="text.class" :style="text.style" @click.prevent="p.scrollToReviews">
    <q-rating :model-value="Number(p.product.average_rating)" readonly size="1.1em" :color="starColor ? undefined : 'amber'" :style="starColor ? { color: starColor } : null" :icon="matStarBorder" :icon-selected="matStar" :icon-half="matStarHalf" />
    <span v-if="d.show_count !== false">{{ Number(p.product.average_rating).toFixed(1) }} · {{ tn('{n} review', '{n} reviews', p.product.review_count) }}</span>
  </a>
</template>

<script setup>
import { computed, inject } from 'vue'
import { matStar, matStarBorder, matStarHalf } from '@quasar/extras/material-icons'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'

/** "Product Rating" (product page template): the stars, linking to the reviews. Nothing before the first review. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const text = computed(() => textStyle(d.value, tsKeys('text')))
const starColor = computed(() => resolveGlobalColor(d.value.star_color))
</script>

<style scoped>
.product-rating { display: inline-flex; align-items: center; gap: 6px; color: inherit; text-decoration: none; font-size: 14px; }
.product-rating:hover span { text-decoration: underline; }
</style>
