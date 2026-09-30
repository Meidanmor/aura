<template>
  <div class="heading-block sb-text-align" :class="sizeClasses" :style="cssVars">
    <component
        :is="tag"
        v-if="d.title"
        class="heading-block__title"
        :style="titleStyle"
    >
      <span v-html="sanitizeSectionText(d.title)" />
    </component>
    <p
        v-if="d.subtitle"
        class="heading-block__subtitle"
        :style="subtitleStyle"
        v-html="sanitizeSectionText(d.subtitle)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { asResponsive, setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'

const TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})

const d = computed(() => props.data.data || {})
const tag = computed(() => (TAGS.has(d.value.tag) ? d.value.tag : 'h2'))

const cssVars = computed(() => {
  const vars = {}
  setResponsiveVar(vars, '--sb-align', d.value.alignment)
  setResponsiveVar(vars, '--hb-size', d.value.font_size, toCssLength)
  setResponsiveVar(vars, '--hb-sub-size', d.value.subtitle_size, toCssLength)
  return vars
})

// Sizes only override the theme's heading typography on devices where one
// is actually set — otherwise the tag's normal size applies.
const sizeClasses = computed(() => {
  const size = asResponsive(d.value.font_size)
  const sub = asResponsive(d.value.subtitle_size)
  return {
    'hb-size-d': !!size.desktop, 'hb-size-t': !!size.tablet, 'hb-size-m': !!size.mobile,
    'hb-sub-d': !!sub.desktop, 'hb-sub-t': !!sub.tablet, 'hb-sub-m': !!sub.mobile,
  }
})

const titleStyle = computed(() => ({
  color: resolveGlobalColor(d.value.title_color) || undefined,
  fontWeight: d.value.font_weight || undefined,
}))

const subtitleStyle = computed(() => ({
  color: resolveGlobalColor(d.value.subtitle_color) || undefined,
}))
</script>

<style scoped>
.heading-block__title { margin: 0; }
.heading-block__subtitle { margin: 8px 0 0; }

@media (min-width: 1024px) {
  .hb-size-d .heading-block__title { font-size: var(--hb-size); line-height: 1.15; }
  .hb-sub-d .heading-block__subtitle { font-size: var(--hb-sub-size); }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .hb-size-t .heading-block__title { font-size: var(--hb-size-t); line-height: 1.15; }
  .hb-sub-t .heading-block__subtitle { font-size: var(--hb-sub-size-t); }
}
@media (max-width: 767px) {
  .hb-size-m .heading-block__title { font-size: var(--hb-size-m); line-height: 1.15; }
  .hb-sub-m .heading-block__subtitle { font-size: var(--hb-sub-size-m); }
}
</style>
