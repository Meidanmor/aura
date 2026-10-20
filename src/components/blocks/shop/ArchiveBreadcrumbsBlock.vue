<template>
  <q-breadcrumbs v-if="a" class="shop-crumbs" :class="linkText.class" :style="linkText.style">
    <q-breadcrumbs-el :label="t('Home')" to="/" />
    <template v-if="a.mode === 'category'">
      <q-breadcrumbs-el :label="t('Products')" to="/products" />
      <q-breadcrumbs-el><span v-html="a.safeCategoryName"></span></q-breadcrumbs-el>
    </template>
    <q-breadcrumbs-el v-else :label="t('Products')" />
  </q-breadcrumbs>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

/** "Breadcrumbs" (All products / category page template). */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const a = inject('productArchive', null)
const linkText = computed(() => textStyle(props.data.data || {}, tsKeys('link')))
</script>

<style scoped>
.shop-crumbs { margin: 20px 0; }
</style>
