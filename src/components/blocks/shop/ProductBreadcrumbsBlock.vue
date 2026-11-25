<template>
  <q-breadcrumbs v-if="p?.product" class="shop-crumbs" :class="[linkText.class, { 'has-ink': !!linkText.style?.color }]" :style="linkText.style" :active-color="linkText.style?.color ? 'inherit' : 'primary'">
    <q-breadcrumbs-el :label="t('Home')" to="/" />
    <q-breadcrumbs-el v-if="p.product.categories?.[0]?.slug" :to="`/product-category/${p.product.categories[0].slug}`"><span v-html="p.safeCategoryName"></span></q-breadcrumbs-el>
    <q-breadcrumbs-el :label="p.product.name" />
  </q-breadcrumbs>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

/** "Breadcrumbs" (product page template): Home › the first category › the product. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const linkText = computed(() => textStyle(props.data.data || {}, tsKeys('link')))
</script>

<style scoped>
/* The owner chose a colour: the links take it too (app.css paints breadcrumb links in the secondary colour; active-color
   "inherit" stops Quasar wrapping them in text-primary, which is the page colour on some stores). */
.has-ink :deep(a.q-breadcrumbs__el.q-link) { color: inherit; }
</style>
