<template>
  <div
      v-if="d.text"
      class="text-block sb-text-align"
      :class="typographyClasses"
      :style="cssVars"
      v-html="sanitizeBuilderHtml(d.text)"
  />
</template>

<script setup>
import { computed } from 'vue'
import { sanitizeBuilderHtml } from 'src/utils/sanitizeHtml.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { asResponsive, setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})

// Computed (not destructured) so live-preview updates stay reactive.
const d = computed(() => props.data.data || {})

const cssVars = computed(() => {
  const vars = {}
  setResponsiveVar(vars, '--sb-align', d.value.alignment)
  setResponsiveVar(vars, '--tb-size', d.value.font_size, toCssLength)
  // Line height may be unitless (1.6) — don't append px to it.
  setResponsiveVar(vars, '--tb-lh', d.value.line_height)
  const color = resolveGlobalColor(d.value.text_color)
  if (color) vars['--tb-color'] = color
  return vars
})

const typographyClasses = computed(() => {
  const size = asResponsive(d.value.font_size)
  const lh = asResponsive(d.value.line_height)
  return {
    'tb-size-d': !!size.desktop, 'tb-size-t': !!size.tablet, 'tb-size-m': !!size.mobile,
    'tb-lh-d': !!lh.desktop, 'tb-lh-t': !!lh.tablet, 'tb-lh-m': !!lh.mobile,
  }
})
</script>

<style scoped>
.text-block { color: var(--tb-color, inherit); }
.text-block :deep(p) { margin: 0 0 1em; }
.text-block :deep(p:last-child),
.text-block :deep(ul:last-child),
.text-block :deep(ol:last-child) { margin-bottom: 0; }
.text-block :deep(a) { color: inherit; text-decoration: underline; }

@media (min-width: 1024px) {
  .tb-size-d { font-size: var(--tb-size); }
  .tb-lh-d { line-height: var(--tb-lh); }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .tb-size-t { font-size: var(--tb-size-t); }
  .tb-lh-t { line-height: var(--tb-lh-t); }
}
@media (max-width: 767px) {
  .tb-size-m { font-size: var(--tb-size-m); }
  .tb-lh-m { line-height: var(--tb-lh-m); }
}
</style>
