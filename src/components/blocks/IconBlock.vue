<template>
  <div class="icon-block" :style="cssVars">
    <component
        :is="tag"
        v-bind="attrs"
        class="icon-block__icon"
        :class="{ 'icon-block__icon--link': !!url }"
        :aria-label="url ? (d.label || undefined) : undefined"
    >
      <BuilderSvg v-if="custom" :image="d.custom_icon" :recolor="!!d.recolor" :alt="url ? '' : (d.label || '')" class="icon-block__glyph icon-block__svg" />
      <q-icon
          v-else
          :name="generalIcons[d.icon] || generalIcons.star"
          class="icon-block__glyph"
          :role="!url && d.label ? 'img' : undefined"
          :aria-label="!url && d.label ? d.label : undefined"
          :aria-hidden="!url && d.label ? undefined : 'true'"
      />
    </component>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import BuilderSvg from './BuilderSvg.vue'
import { generalIcons } from 'src/utils/builder-icons.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { setResponsiveVar, toCssLength, alignToFlex } from 'src/composables/useSectionStyle.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})

const d = computed(() => props.data.data || {})
const custom = computed(() => d.value.icon === 'custom' && !!d.value.custom_icon)
const url = computed(() => String(d.value.link_url || ''))
const isInternal = (u) => u.startsWith('/') && !u.startsWith('//')

const tag = computed(() => (!url.value ? 'span' : isInternal(url.value) ? RouterLink : 'a'))
const attrs = computed(() => {
  const u = url.value
  if (!u) return {}
  const base = isInternal(u) ? { to: u } : { href: u }
  return d.value.new_tab ? { ...base, target: '_blank', rel: 'noopener noreferrer' } : base
})

const cssVars = computed(() => {
  const vars = {}
  setResponsiveVar(vars, '--ic-size', d.value.size || '32px', toCssLength)
  if (custom.value) {
    // Your own SVG: width and height apart; one left empty follows the SVG's proportions.
    // Blocks saved before had only Icon Size: that stays their width.
    const w = d.value.icon_width
    const h = d.value.icon_height
    const has = (v) => (v && typeof v === 'object' ? Object.values(v).some(Boolean) : !!v)
    setResponsiveVar(vars, '--ic-w', has(w) ? w : has(h) ? '' : (d.value.size || '32px'), toCssLength)
    setResponsiveVar(vars, '--ic-h', h, toCssLength)
    const img = d.value.custom_icon
    if (img && img.width > 0 && img.height > 0) vars['--ic-ratio'] = `${img.width} / ${img.height}`
  }
  setResponsiveVar(vars, '--ic-align', d.value.alignment, alignToFlex)
  const color = resolveGlobalColor(d.value.color)
  if (color) vars['--ic-color'] = color
  const hover = resolveGlobalColor(d.value.hover_color)
  if (hover) vars['--ic-hover'] = hover
  return vars
})
</script>

<style scoped>
.icon-block { display: flex; justify-content: var(--ic-align, flex-start); }
.icon-block__icon {
  display: inline-flex;
  color: var(--ic-color, currentColor);
  text-decoration: none;
  transition: color 0.2s;
}
.icon-block__icon--link:hover,
.icon-block__icon--link:focus-visible { color: var(--ic-hover, var(--ic-color, currentColor)); }
.icon-block__icon--link:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; border-radius: 2px; }
.icon-block__glyph { font-size: var(--ic-size, 32px); width: var(--ic-size, 32px); height: var(--ic-size, 32px); }
/* Your own SVG: a width and/or height; "auto" for the other keeps the SVG's proportions
   (the code draws at that size; the mask / image fallback uses the file's own ratio). */
.icon-block__glyph.icon-block__svg {
  --icw: var(--ic-w, auto);
  --ich: var(--ic-h, auto);
  display: inline-flex;
  width: var(--icw);
  height: var(--ich);
  aspect-ratio: var(--ic-ratio, auto);
  font-size: inherit;
}
.icon-block__svg:deep(> svg) { width: var(--icw); height: var(--ich); max-width: 100%; }
@media (max-width: 1023px) {
  .icon-block__glyph.icon-block__svg { --icw: var(--ic-w-t, var(--ic-w, auto)); --ich: var(--ic-h-t, var(--ic-h, auto)); }
}
@media (max-width: 767px) {
  .icon-block__glyph.icon-block__svg { --icw: var(--ic-w-m, var(--ic-w-t, var(--ic-w, auto))); --ich: var(--ic-h-m, var(--ic-h-t, var(--ic-h, auto))); }
}
@media (max-width: 1023px) {
  .icon-block { justify-content: var(--ic-align-t, var(--ic-align, flex-start)); }
  .icon-block__glyph { font-size: var(--ic-size-t, var(--ic-size, 32px)); width: var(--ic-size-t, var(--ic-size, 32px)); height: var(--ic-size-t, var(--ic-size, 32px)); }
}
@media (max-width: 767px) {
  .icon-block { justify-content: var(--ic-align-m, var(--ic-align-t, var(--ic-align, flex-start))); }
  .icon-block__glyph { font-size: var(--ic-size-m, var(--ic-size-t, var(--ic-size, 32px))); width: var(--ic-size-m, var(--ic-size-t, var(--ic-size, 32px))); height: var(--ic-size-m, var(--ic-size-t, var(--ic-size, 32px))); }
}
</style>
