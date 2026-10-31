<template>
  <div class="checkout-part">
    <div v-if="showTitle" class="text-h6 checkout-part__title" :class="titleText.class" :style="titleText.style">{{ title }}</div>
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

/**
 * What every checkout part block shares: its title ("" = the built-in one).
 * "In a card" is drawn on the block's own wrapper (`.sb-card`, see
 * buildBlockWrapperStyle), so the Style tab's padding, border, corners and
 * margin change it.
 */
const props = defineProps({ data: { type: Object, default: () => ({}) }, defaultTitle: { type: String, default: '' } })
const title = computed(() => props.data.title || props.defaultTitle)
const showTitle = computed(() => props.data.show_title !== false && !!title.value)
const titleText = computed(() => textStyle(props.data, tsKeys('title'), 'headings'))
</script>

<style scoped>
.checkout-part__title { margin-bottom: 8px; }
</style>
