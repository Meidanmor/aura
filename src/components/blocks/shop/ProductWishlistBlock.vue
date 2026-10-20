<template>
  <div v-if="p?.product" class="product-wishlist">
    <q-btn
        class="q-pa-none text-caption"
        :class="[text.class, hasColor ? '' : 'text-black']"
        :style="text.style"
        flat
        :loading="p.wishlist.isLoading(p.product.id)"
        color="accent"
        :label="saved ? (d.remove_label || t('Remove from wishlist')) : (d.add_label || t('Add to wishlist'))"
        :icon="saved ? matFavorite : matFavoriteBorder"
        @click="p.addToWishlist"
    />
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { matFavorite, matFavoriteBorder } from '@quasar/extras/material-icons'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

/** "Wishlist Button" (product page template): adds the product (or the chosen variant) to the wishlist. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const text = computed(() => textStyle(d.value, tsKeys('text')))
const hasColor = computed(() => !!d.value.text_color)
// The same check the page always made (the chosen variant, else the product).
const saved = computed(() => {
  const items = p?.wishlist.state.items
  if (!items) return false
  const id = p.selectedVariation ? p.selectedVariation.id : p.product.id
  return Object.values(items).some((obj) => obj.id === id)
})
</script>
