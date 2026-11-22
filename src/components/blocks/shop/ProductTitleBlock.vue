<template>
  <component :is="tag" v-if="p?.product" class="product-title" :class="titleText.class" :style="[{ textAlign: align }, titleText.style]">{{ p.product.name }}<span v-if="sample" class="product-title__sample">{{ t('Sample') }}</span></component>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { isSampleProduct } from 'src/utils/sample-product.js'
import { t } from 'src/i18n/index.js'

/** "Product Name" (product page template). */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))
const tag = computed(() => (d.value.tag === 'h2' ? 'h2' : 'h1'))
// A sample product (the AI's prompt setup): a small "Sample" badge after the name.
const sample = computed(() => isSampleProduct(p?.product))
const align = computed(() => (['left', 'center', 'right'].includes(d.value.align) ? d.value.align : 'start'))
</script>

<style scoped>
.product-title { margin: 0; overflow-wrap: anywhere; }
.product-title__sample {
  display: inline-block;
  vertical-align: middle;
  margin-inline-start: 0.5em;
  padding: 0.15em 0.6em;
  border-radius: 999px;
  border: 1px solid currentColor;
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0;
}
</style>
