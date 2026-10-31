<template>
  <div class="bis-block">
    <BackInStockForm :product="p?.product" :data="d" :preview="editor" />
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import BackInStockForm from 'src/components/product/BackInStockForm.vue'
import { isEditorMode } from 'src/utils/config-loader.js'

/**
 * "Back In Stock Form" (product page template): "Notify me when it's back" on a sold-out
 * product, with the owner's texts and look. While it's on the page, Add To Cart doesn't
 * draw its own built-in copy (app.css, .bis-fallback). The Store builder preview always
 * shows it, so the owner can style it.
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const editor = typeof window !== 'undefined' && isEditorMode()
</script>
