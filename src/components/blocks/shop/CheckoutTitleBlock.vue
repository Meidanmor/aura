<template>
  <h1 class="checkout-title" :class="titleText.class" :style="[{ textAlign: align }, titleText.style]">{{ d.title || t('Checkout') }}</h1>
</template>

<script setup>
import { computed } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

/** "Checkout Title" (checkout page template). */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const d = computed(() => props.data.data || {})
const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))
const align = computed(() => (['left', 'center', 'right'].includes(d.value.align) ? d.value.align : 'start'))
</script>
