<template>
  <div v-if="images.length" class="image-block" :class="layoutClasses" :style="cssVars">
    <figure
        v-for="(img, idx) in images"
        :key="idx"
        class="image-block__item"
    >
      <component
          :is="img.link_url ? linkTag(img.link_url) : 'div'"
          v-bind="img.link_url ? linkAttrs(img) : {}"
          class="image-block__frame"
      >
        <img
            class="image-block__img"
            :src="img.src"
            :alt="img.alt || ''"
            :width="img.width || undefined"
            :height="img.height || undefined"
            loading="lazy"
            decoding="async"
        />
      </component>
      <figcaption v-if="img.caption" class="image-block__caption">{{ img.caption }}</figcaption>
    </figure>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { asResponsive, setResponsiveVar, toCssLength, alignToFlex, DEVICES } from 'src/composables/useSectionStyle.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})

const LAYOUTS = new Set(['row', 'grid', 'stacked'])
const SHORT = { desktop: 'd', tablet: 't', mobile: 'm' }
const RATIOS = new Set(['1/1', '4/3', '3/2', '16/9', '3/4', '2/3'])
const FITS = new Set(['cover', 'contain', 'fill', 'none'])

const d = computed(() => props.data.data || {})

// Image payloads are { url, width, height } (schema v3); older JSON had a
// plain URL string.
const images = computed(() => (d.value.images || [])
    .map((img) => {
      const payload = typeof img.image === 'string' ? { url: img.image } : (img.image || {})
      return { ...img, src: payload.url, width: payload.width, height: payload.height }
    })
    .filter((img) => img.src))

const layoutClasses = computed(() => {
  const layout = asResponsive(d.value.layout || 'row')
  const w = asResponsive(d.value.image_width)
  const h = asResponsive(d.value.image_height)
  const r = asResponsive(d.value.aspect_ratio)
  const classes = {}
  for (const device of DEVICES) {
    const s = SHORT[device]
    classes[`ib-${LAYOUTS.has(layout[device]) ? layout[device] : 'row'}-${s}`] = true
    classes[`ib-w-${s}`] = !!w[device]
    classes[`ib-h-${s}`] = !!h[device]
    classes[`ib-r-${s}`] = !h[device] && RATIOS.has(r[device])
  }
  return classes
})

const cssVars = computed(() => {
  const vars = {}
  setResponsiveVar(vars, '--ib-cols', d.value.columns, (v) => (v ? Math.max(1, Math.min(6, Number(v))) : null))
  setResponsiveVar(vars, '--ib-gap', d.value.gap, toCssLength)
  setResponsiveVar(vars, '--ib-w', d.value.image_width, toCssLength)
  setResponsiveVar(vars, '--ib-maxw', d.value.image_max_width, toCssLength)
  setResponsiveVar(vars, '--ib-h', d.value.image_height, toCssLength)
  setResponsiveVar(vars, '--ib-ratio', d.value.aspect_ratio, (v) => (RATIOS.has(v) ? v.replace('/', ' / ') : null))
  setResponsiveVar(vars, '--ib-align', d.value.alignment, alignToFlex)
  const radius = toCssLength(d.value.border_radius)
  if (radius) vars['--ib-radius'] = radius
  vars['--ib-fit'] = FITS.has(d.value.object_fit) ? d.value.object_fit : 'cover'
  return vars
})

const isInternal = (url) => url.startsWith('/') && !url.startsWith('//')

function linkTag(url) {
  return isInternal(url) ? RouterLink : 'a'
}

function linkAttrs(img) {
  if (isInternal(img.link_url)) {
    return img.new_tab ? { to: img.link_url, target: '_blank', rel: 'noopener' } : { to: img.link_url }
  }
  return img.new_tab
      ? { href: img.link_url, target: '_blank', rel: 'noopener noreferrer' }
      : { href: img.link_url }
}
</script>

<style scoped>
.image-block {
  display: flex;
  gap: var(--ib-gap, 16px);
}
.image-block__item {
  margin: 0;
  min-width: 0;
  max-width: var(--ib-maxw, 100%);
}
.image-block__frame {
  display: block;
  overflow: hidden;
  border-radius: var(--ib-radius, 0);
}
.image-block__img {
  display: block;
  max-width: 100%;
  height: auto;
  object-fit: var(--ib-fit, cover);
  border-radius: var(--ib-radius, 0);
}
.image-block__caption {
  margin-top: 8px;
  font-size: 0.875em;
  opacity: 0.8;
}

/* ---- Desktop (>= 1024px) ---- */
@media (min-width: 1024px) {
  .ib-row-d { flex-direction: row; flex-wrap: wrap; justify-content: var(--ib-align, center); align-items: flex-start; }
  .ib-stacked-d { flex-direction: column; align-items: var(--ib-align, center); }
  .ib-grid-d { display: grid; grid-template-columns: repeat(var(--ib-cols, 3), minmax(0, 1fr)); justify-items: var(--ib-align, center); }
  .ib-grid-d .image-block__item { width: 100%; }
  .ib-grid-d .image-block__img { width: 100%; }
  .ib-w-d .image-block__item { width: var(--ib-w); }
  .ib-w-d .image-block__img { width: 100%; }
  .ib-h-d .image-block__img { height: var(--ib-h); width: 100%; }
  .ib-r-d .image-block__img { aspect-ratio: var(--ib-ratio); width: 100%; height: auto; }
  .image-block { gap: var(--ib-gap, 16px); }
}

/* ---- Tablet (768px – 1023px) ---- */
@media (min-width: 768px) and (max-width: 1023px) {
  .ib-row-t { flex-direction: row; flex-wrap: wrap; justify-content: var(--ib-align-t, center); align-items: flex-start; }
  .ib-stacked-t { flex-direction: column; align-items: var(--ib-align-t, center); }
  .ib-grid-t { display: grid; grid-template-columns: repeat(var(--ib-cols-t, 2), minmax(0, 1fr)); justify-items: var(--ib-align-t, center); }
  .ib-grid-t .image-block__item { width: 100%; }
  .ib-grid-t .image-block__img { width: 100%; }
  .ib-w-t .image-block__item { width: var(--ib-w-t); }
  .ib-w-t .image-block__img { width: 100%; }
  .ib-h-t .image-block__img { height: var(--ib-h-t); width: 100%; }
  .ib-r-t .image-block__img { aspect-ratio: var(--ib-ratio-t); width: 100%; height: auto; }
  .image-block { gap: var(--ib-gap-t, 16px); }
  .image-block__item { max-width: var(--ib-maxw-t, 100%); }
}

/* ---- Mobile (<= 767px) ---- */
@media (max-width: 767px) {
  .ib-row-m { flex-direction: row; flex-wrap: wrap; justify-content: var(--ib-align-m, center); align-items: flex-start; }
  .ib-stacked-m { flex-direction: column; align-items: var(--ib-align-m, center); }
  .ib-grid-m { display: grid; grid-template-columns: repeat(var(--ib-cols-m, 1), minmax(0, 1fr)); justify-items: var(--ib-align-m, center); }
  .ib-grid-m .image-block__item { width: 100%; }
  .ib-grid-m .image-block__img { width: 100%; }
  .ib-w-m .image-block__item { width: var(--ib-w-m); }
  .ib-w-m .image-block__img { width: 100%; }
  .ib-h-m .image-block__img { height: var(--ib-h-m); width: 100%; }
  .ib-r-m .image-block__img { aspect-ratio: var(--ib-ratio-m); width: 100%; height: auto; }
  .image-block { gap: var(--ib-gap-m, 16px); }
  .image-block__item { max-width: var(--ib-maxw-m, 100%); }
}
</style>
