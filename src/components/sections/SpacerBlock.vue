<template>
  <div class="spacer-block" :style="cssVars" aria-hidden="true" />
</template>

<script setup>
import { computed } from 'vue'
import { setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})

const cssVars = computed(() => {
  const vars = {}
  setResponsiveVar(vars, '--sp-h', props.data.data?.height ?? '48px', toCssLength)
  return vars
})
</script>

<style scoped>
.spacer-block { height: var(--sp-h, 48px); }
@media (max-width: 1023px) { .spacer-block { height: var(--sp-h-t, var(--sp-h, 48px)); } }
@media (max-width: 767px) { .spacer-block { height: var(--sp-h-m, var(--sp-h-t, var(--sp-h, 48px))); } }
</style>
