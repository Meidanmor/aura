<template>
  <q-card v-if="card" class="q-mb-md checkout-part">
    <q-card-section class="q-pa-md">
      <div v-if="showTitle" class="text-h6 checkout-part__title" :class="titleText.class" :style="titleText.style">{{ title }}</div>
      <slot />
    </q-card-section>
  </q-card>
  <div v-else class="checkout-part checkout-part--plain">
    <div v-if="showTitle" class="text-h6 checkout-part__title" :class="titleText.class" :style="titleText.style">{{ title }}</div>
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

/**
 * The frame every checkout part block shares: a card (or nothing, so the
 * block's Style tab does the box) and its title ("" = the built-in one).
 */
const props = defineProps({ data: { type: Object, default: () => ({}) }, defaultTitle: { type: String, default: '' } })
const card = computed(() => props.data.card !== false)
const title = computed(() => props.data.title || props.defaultTitle)
const showTitle = computed(() => props.data.show_title !== false && !!title.value)
const titleText = computed(() => textStyle(props.data, tsKeys('title'), 'headings'))
</script>

<style scoped>
.checkout-part__title { margin-bottom: 8px; }
</style>
