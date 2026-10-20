<template>
  <q-breadcrumbs v-if="p?.product" class="shop-crumbs" :class="linkText.class" :style="linkText.style">
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
