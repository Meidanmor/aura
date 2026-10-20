<template>
  <div v-if="p?.product?.categories?.length" class="product-cats" :class="`is-${display}`">
    <router-link v-for="cat in p.product.categories" :key="cat.id" :to="`/product-category/${cat.slug}`" class="no-decoration product-cat" :class="text.class" :style="text.style">
      <q-chip v-if="display === 'chips'" :color="chipBg ? undefined : 'secondary'" :style="chipBg ? { background: chipBg } : null" text-color="white" class="category-chip" dense clickable>
        <span>{{ cat.name }}</span>
      </q-chip>
      <span v-else>{{ cat.name }}</span>
    </router-link>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'

/** "Product Categories" (product page template): labels or links to the product's categories. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const display = computed(() => (d.value.display === 'links' ? 'links' : 'chips'))
const chipBg = computed(() => resolveGlobalColor(d.value.chip_bg))
const text = computed(() => textStyle(d.value, tsKeys('text')))
</script>

<style scoped>
.product-cats { display: flex; flex-wrap: wrap; gap: 4px 12px; }
.product-cats.is-chips { gap: 0; }
.category-chip { display: inline-flex; }
.is-links .product-cat { text-decoration: underline; color: inherit; }
</style>
