<template>
  <component :is="tag" class="cart-title" :class="titleText.class" :style="[{ textAlign: align }, titleText.style]">{{ d.title || t('Your Cart') }}</component>
</template>

<script setup>
import { computed } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

/** "Cart Title" (cart page template). */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const d = computed(() => props.data.data || {})
const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))
const tag = computed(() => (d.value.tag === 'h1' ? 'h1' : 'h2'))
const align = computed(() => (['left', 'center', 'right'].includes(d.value.align) ? d.value.align : 'start'))
</script>
