<template>
  <div v-if="d.text && d.url" class="btn-block" :class="fullWidthClasses" :style="wrapVars">
    <q-btn
        v-bind="linkAttrs"
        class="btn-block__btn"
        :class="[`btn-block__btn--${variant}`, `btn-block__btn--${size}`]"
        :style="btnVars"
        :label="d.text"
        :outline="variant === 'outline'"
        :flat="variant === 'flat' || variant === 'link'"
        :unelevated="variant === 'primary' || variant === 'secondary'"
        :color="qColor"
        :size="qSize"
        no-caps
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { asResponsive, setResponsiveVar, toCssLength, alignToFlex } from 'src/composables/useSectionStyle.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})

const route = useRoute()
const d = computed(() => props.data.data || {})

const VARIANTS = new Set(['primary', 'secondary', 'outline', 'flat', 'link'])
const variant = computed(() => (VARIANTS.has(d.value.style) ? d.value.style : 'primary'))
const size = computed(() => (['sm', 'md', 'lg'].includes(d.value.size) ? d.value.size : 'md'))
const qSize = computed(() => ({ sm: 'sm', md: 'md', lg: 'lg' }[size.value]))

// Custom colors win over the variant's theme color.
const qColor = computed(() => {
  if (d.value.bg_color && (variant.value === 'primary' || variant.value === 'secondary')) return undefined
  return variant.value === 'secondary' ? 'secondary' : 'primary'
})

const linkAttrs = computed(() => {
  const url = d.value.url || ''
  const newTab = !!d.value.new_tab

  if (url.startsWith('#')) {
    // In-page anchor (e.g. a section's Anchor ID).
    return { to: { path: route.path, hash: url } }
  }
  if (url.startsWith('/') && !url.startsWith('//')) {
    return newTab ? { to: url, target: '_blank', rel: 'noopener' } : { to: url }
  }
  return newTab
      ? { href: url, target: '_blank', rel: 'noopener noreferrer', type: 'a' }
      : { href: url, type: 'a' }
})

const wrapVars = computed(() => {
  const vars = {}
  setResponsiveVar(vars, '--btn-justify', d.value.alignment, alignToFlex)
  return vars
})

const fullWidthClasses = computed(() => {
  const a = asResponsive(d.value.alignment)
  return { 'btn-full-d': a.desktop === 'stretch', 'btn-full-t': a.tablet === 'stretch', 'btn-full-m': a.mobile === 'stretch' }
})

const btnVars = computed(() => {
  const vars = {}
  const bg = resolveGlobalColor(d.value.bg_color)
  const txt = resolveGlobalColor(d.value.text_color)
  if (variant.value === 'primary' || variant.value === 'secondary') {
    // Set explicitly: the theme's global `body .q-btn { background: … }`
    // rule would otherwise override Quasar's bg-primary/bg-secondary.
    vars.background = bg || `var(--q-${variant.value})`
  } else if (bg && variant.value === 'outline') {
    vars['border-color'] = bg
  }
  // !important: Quasar's text-* color classes are !important themselves.
  if (txt) vars.color = `${txt} !important`
  const radius = toCssLength(d.value.border_radius)
  if (radius) vars['border-radius'] = radius
  return vars
})
</script>

<style scoped>
.btn-block { display: flex; justify-content: var(--btn-justify, flex-start); }
@media (max-width: 1023px) { .btn-block { justify-content: var(--btn-justify-t, flex-start); } }
@media (max-width: 767px) { .btn-block { justify-content: var(--btn-justify-m, flex-start); } }

/* "Full width" alignment, per device. */
@media (min-width: 1024px) { .btn-full-d .btn-block__btn { width: 100%; } }
@media (min-width: 768px) and (max-width: 1023px) { .btn-full-t .btn-block__btn { width: 100%; } }
@media (max-width: 767px) { .btn-full-m .btn-block__btn { width: 100%; } }

.btn-block__btn--lg { padding: 10px 30px; }
.btn-block__btn--link { text-decoration: underline; text-underline-offset: 6px; padding-left: 0; padding-right: 0; }
.btn-block__btn--link :deep(.q-focus-helper) { display: none; }
</style>
