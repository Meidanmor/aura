<template>
  <div v-if="a?.totalProducts" class="archive-count text-subtitle1" :class="text.class" :style="text.style">
    {{ tn('Found {n} product', 'Found {n} products', a.totalProducts || 0) }}
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

/** "Number of Products" (All products / category page template): "Found 12 products". */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const a = inject('productArchive', null)
const text = computed(() => textStyle(props.data.data || {}, tsKeys('text')))
</script>
