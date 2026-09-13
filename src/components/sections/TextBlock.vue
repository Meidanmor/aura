<template>
  <div v-if="data.text" :style="cssVars" class="text-block" :class="`text-block--${data.alignment || 'left'}`">
    <p v-html="sanitizeSectionText(data.text)" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'

const props = defineProps({
  data: { type: Object, required: true },
  sectionId: { type: String, required: true },
  sectionBg: { type: String, default: '' }
})

const resolveGlobalColor = (color) => {
  if (!color) return ''
  const map = {
    'global:primary': 'var(--q-primary)',
    'global:secondary': 'var(--q-secondary)',
    'global:accent': 'var(--q-accent)',
    'global:text': 'var(--q-text)'
  }
  return map[color] || color
}

const cssVars = computed(() => {
  const color = resolveGlobalColor(data.text_color)
  return color ? { '--text-block-color': color } : {}
})

const { data } = props
</script>

<style scoped>
.text-block { color: var(--text-block-color, inherit); }
.text-block--left { text-align: left; }
.text-block--center { text-align: center; }
.text-block--right { text-align: right; }
</style>