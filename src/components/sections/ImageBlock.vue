<template>
  <div v-if="images.length" class="image-block" :class="[layoutClasses, hoverClass]" :style="cssVars">
    <figure
        v-for="(img, idx) in images"
        :key="idx"
        class="image-block__item"
    >
      <!-- The box holds the image (maybe a link) and, beside it, its product tags (links can't nest). -->
      <div class="image-block__box">
      <component
          :is="img.link_url ? linkTag(img.link_url) : 'div'"
          v-bind="img.link_url ? linkAttrs(img) : {}"
          class="image-block__frame"
          :class="{ 'has-solid': !!img.solidSrc }"
      >
        <!-- Style → SVG "Draw SVG images as code": in the page, so it can take a colour. -->
        <BuilderSvg
            v-if="img.asSvg"
            class="image-block__img image-block__svg"
            :style="img.svgStyle"
            :image="img.image"
            :recolor="!!svgColor"
            :alt="img.alt || ''"
        />
        <img
            v-else
            class="image-block__img"
            :src="img.src"
            :srcset="picked && idx === 0 ? undefined : img.srcset"
            :sizes="picked && idx === 0 || !img.srcset ? undefined : LAZY_SIZES"
            v-fit-sizes
            :alt="img.alt || ''"
            :width="img.width || undefined"
            :height="img.height || undefined"
            :loading="picked && idx === 0 ? 'eager' : 'lazy'"
            :fetchpriority="picked && idx === 0 ? 'high' : undefined"
            decoding="async"
        />
        <!-- A fixed header turned solid shows this one instead (a dark logo for a light header). -->
        <img
            v-if="img.solidSrc"
            class="image-block__img image-block__img--solid"
            :src="img.solidSrc"
            :alt="img.alt || ''"
            :width="img.width || undefined"
            :height="img.height || undefined"
            loading="lazy"
            decoding="async"
        />
        <!-- Hover Effect "Show the second image": loaded lazily, never in the page's first paint. -->
        <img
            v-if="hover === 'swap' && img.hoverSrc"
            class="image-block__img image-block__img--hover"
            :src="img.hoverSrc"
            :srcset="img.hoverSrcset"
            :sizes="img.hoverSrcset ? LAZY_SIZES : undefined"
            v-fit-sizes
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
        />
      </component>
      <ProductTags
          v-if="img.tags?.length"
          :tags="img.tags"
          :image="img.image"
          :fit="d.object_fit || 'cover'"
      />
      </div>
      <figcaption v-if="img.caption" class="image-block__caption" v-bind="captionText">{{ img.caption }}</figcaption>
    </figure>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePriorityBlock } from 'src/composables/usePriorityBlock.js'
import { RouterLink } from 'vue-router'
import ProductTags from './ProductTags.vue'
import BuilderSvg from '../blocks/BuilderSvg.vue'
import { safeSvg } from 'src/utils/inline-svg.js'
import { srcsetOf, LAZY_SIZES, vFitSizes } from 'src/utils/responsive-image.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
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
const svgColor = computed(() => (d.value.svg_inline ? resolveGlobalColor(d.value.svg_color) : ''))
const captionText = computed(() => textStyle(d.value, tsKeys('caption')))

// Image payloads are { url, width, height } (schema v3); older JSON had a
// plain URL string.
// The page's first image (src/utils/priority-image.js).
const picked = usePriorityBlock(props.blockId)

const images = computed(() => (d.value.images || [])
    .map((img) => {
      const payload = typeof img.image === 'string' ? { url: img.image } : (img.image || {})
      const hoverSrc = typeof img.hover_image === 'string' ? img.hover_image : (img.hover_image?.url || '')
      const solidSrc = typeof img.solid_image === 'string' ? img.solid_image : (img.solid_image?.url || '')
      // Drawn as code when the store sent the SVG's code, or (to recolour it) as a mask.
      const asSvg = !!d.value.svg_inline && (!!safeSvg(payload) || (!!svgColor.value && /\.svg(\?|$)/i.test(payload.url || '')))
      const svgStyle = asSvg && payload.width && payload.height
        ? { '--svg-w': `${payload.width}px`, aspectRatio: `${payload.width} / ${payload.height}` }
        : {}
      return { ...img, src: payload.url, srcset: srcsetOf(payload), width: payload.width, height: payload.height, hoverSrc, hoverSrcset: srcsetOf(img.hover_image), solidSrc, asSvg, svgStyle }
    })
    .filter((img) => img.src))

const HOVERS = new Set(['zoom', 'darken', 'swap'])
const hover = computed(() => (HOVERS.has(d.value.hover_effect) ? d.value.hover_effect : ''))
const hoverClass = computed(() => (hover.value ? `ib-hover-${hover.value}` : ''))

const layoutClasses = computed(() => {
  const layout = asResponsive(d.value.layout || 'row')
  const w = asResponsive(d.value.image_width)
  const h = asResponsive(d.value.image_height)
  const r = asResponsive(d.value.aspect_ratio)
  const fill = asResponsive(d.value.fill_height)
  const classes = {}
  for (const device of DEVICES) {
    const s = SHORT[device]
    // "Match the Row Height": the row sets the height; Image Height is only the stacked fallback.
    const fills = fill[device] === 'yes'
    classes[`ib-${LAYOUTS.has(layout[device]) ? layout[device] : 'row'}-${s}`] = true
    classes[`ib-w-${s}`] = !!w[device]
    classes[`ib-h-${s}`] = !fills && !!h[device]
    classes[`ib-r-${s}`] = !fills && !h[device] && RATIOS.has(r[device])
    classes[`ib-fill-${s}`] = fills
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
  // Style → Size → Rotate: the image and its product tags tilt together.
  setResponsiveVar(vars, '--ib-rot', d.value.rotate, (v) => (Number(v) ? `${Math.max(-45, Math.min(45, Number(v)))}deg` : null))
  const radius = toCssLength(d.value.border_radius)
  if (radius) vars['--ib-radius'] = radius
  vars['--ib-fit'] = FITS.has(d.value.object_fit) ? d.value.object_fit : 'cover'
  if (svgColor.value) vars['--ib-svg-color'] = svgColor.value
  return vars
})

const isInternal = (url) => url.startsWith('/') && !url.startsWith('//')

function linkTag(url) {
  return isInternal(url) ? RouterLink : 'a'
}

function linkAttrs(img) {
  // The image's Screen Reader Label, else the link is named by the image's alt text.
  const label = img.aria_label ? { 'aria-label': img.aria_label } : {}
  if (isInternal(img.link_url)) {
    return { ...(img.new_tab ? { to: img.link_url, target: '_blank', rel: 'noopener' } : { to: img.link_url }), ...label }
  }
  return {
    ...(img.new_tab ? { href: img.link_url, target: '_blank', rel: 'noopener noreferrer' } : { href: img.link_url }),
    ...label,
  }
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
.image-block__box { position: relative; transform: rotate(var(--ib-rot, 0deg)); }
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
/* An SVG drawn as code: its own width at most, its own shape. */
.image-block__svg { width: var(--svg-w, 100%); color: var(--ib-svg-color, inherit); }
/* Hover effects (Style → Hover) */
.ib-hover-zoom .image-block__img { transition: transform .7s cubic-bezier(.2, .7, .2, 1); }
.ib-hover-darken .image-block__frame,
.ib-hover-swap .image-block__frame { position: relative; }
.image-block__img--solid { display: none; }
:global(header.header-solid) .image-block__frame.has-solid > .image-block__img:not(.image-block__img--solid) { display: none; }
:global(header.header-solid) .image-block__frame.has-solid > .image-block__img--solid { display: block; }
.ib-hover-darken .image-block__frame::after {
  content: '';
  position: absolute;
  inset: 0;
  background: #000;
  opacity: 0;
  transition: opacity .35s ease;
  pointer-events: none;
  border-radius: var(--ib-radius, 0);
}
.image-block__img--hover {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
  opacity: 0;
  transition: opacity .45s ease;
}
@media (hover: hover) {
  .ib-hover-zoom .image-block__frame:hover .image-block__img { transform: scale(1.06); }
  .ib-hover-darken .image-block__frame:hover::after { opacity: .18; }
  .ib-hover-swap .image-block__frame:hover .image-block__img--hover { opacity: 1; }
}
/* Touch screens: while a finger is on it (boot/touch-press.js). */
.ib-hover-zoom .image-block__frame.is-pressed .image-block__img { transform: scale(1.06); }
.ib-hover-darken .image-block__frame.is-pressed::after { opacity: .18; }
.ib-hover-swap .image-block__frame.is-pressed .image-block__img--hover { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .ib-hover-zoom .image-block__img, .image-block__img--hover { transition: none; }
  .ib-hover-zoom .image-block__frame:hover .image-block__img,
  .ib-hover-zoom .image-block__frame.is-pressed .image-block__img { transform: none; }
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
  /* Match the Row Height: the block stretches to the row and the image fills it, adding no height of its own. */
  .ib-fill-d { height: 100%; align-items: stretch; }
  .ib-fill-d .image-block__item { flex: 1 1 0; display: flex; flex-direction: column; }
  .ib-fill-d.ib-w-d .image-block__item { flex: 0 1 auto; }
  .ib-fill-d .image-block__box { flex: 1 1 auto; min-height: var(--ib-h, 240px); }
  .ib-fill-d .image-block__frame { position: absolute; inset: 0; }
  .ib-fill-d .image-block__img { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; aspect-ratio: auto; }
  :global(.sb-block:has(> .ib-fill-d)) { align-self: stretch; }
  :global(.sb-block:not(.sb-has-w):has(> .ib-fill-d)) { flex: 1 1 0; }
  .image-block { gap: var(--ib-gap, 16px); }
}

/* ---- Tablet (768px – 1023px) ---- */
@media (min-width: 768px) and (max-width: 1023px) {
  .ib-row-t { flex-direction: row; flex-wrap: wrap; justify-content: var(--ib-align-t, var(--ib-align, center)); align-items: flex-start; }
  .ib-stacked-t { flex-direction: column; align-items: var(--ib-align-t, var(--ib-align, center)); }
  .ib-grid-t { display: grid; grid-template-columns: repeat(var(--ib-cols-t, var(--ib-cols, 2)), minmax(0, 1fr)); justify-items: var(--ib-align-t, var(--ib-align, center)); }
  .ib-grid-t .image-block__item { width: 100%; }
  .ib-grid-t .image-block__img { width: 100%; }
  .ib-w-t .image-block__item { width: var(--ib-w-t, var(--ib-w)); }
  .ib-w-t .image-block__img { width: 100%; }
  .ib-h-t .image-block__img { height: var(--ib-h-t, var(--ib-h)); width: 100%; }
  .ib-r-t .image-block__img { aspect-ratio: var(--ib-ratio-t, var(--ib-ratio)); width: 100%; height: auto; }
  /* Match the Row Height: the block stretches to the row and the image fills it, adding no height of its own. */
  .ib-fill-t { height: 100%; align-items: stretch; }
  .ib-fill-t .image-block__item { flex: 1 1 0; display: flex; flex-direction: column; }
  .ib-fill-t.ib-w-t .image-block__item { flex: 0 1 auto; }
  .ib-fill-t .image-block__box { flex: 1 1 auto; min-height: var(--ib-h-t, var(--ib-h, 240px)); }
  .ib-fill-t .image-block__frame { position: absolute; inset: 0; }
  .ib-fill-t .image-block__img { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; aspect-ratio: auto; }
  :global(.sb-block:has(> .ib-fill-t)) { align-self: stretch; }
  :global(.sb-block:not(.sb-has-w):has(> .ib-fill-t)) { flex: 1 1 0; }
  .image-block { gap: var(--ib-gap-t, var(--ib-gap, 16px)); }
  .image-block__item { max-width: var(--ib-maxw-t, var(--ib-maxw, 100%)); }
  .image-block__box { transform: rotate(var(--ib-rot-t, var(--ib-rot, 0deg))); }
}

/* ---- Mobile (<= 767px) ---- */
@media (max-width: 767px) {
  .ib-row-m { flex-direction: row; flex-wrap: wrap; justify-content: var(--ib-align-m, var(--ib-align-t, var(--ib-align, center))); align-items: flex-start; }
  .ib-stacked-m { flex-direction: column; align-items: var(--ib-align-m, var(--ib-align-t, var(--ib-align, center))); }
  .ib-grid-m { display: grid; grid-template-columns: repeat(var(--ib-cols-m, var(--ib-cols-t, var(--ib-cols, 1))), minmax(0, 1fr)); justify-items: var(--ib-align-m, var(--ib-align-t, var(--ib-align, center))); }
  .ib-grid-m .image-block__item { width: 100%; }
  .ib-grid-m .image-block__img { width: 100%; }
  .ib-w-m .image-block__item { width: var(--ib-w-m, var(--ib-w-t, var(--ib-w))); }
  .ib-w-m .image-block__img { width: 100%; }
  .ib-h-m .image-block__img { height: var(--ib-h-m, var(--ib-h-t, var(--ib-h))); width: 100%; }
  .ib-r-m .image-block__img { aspect-ratio: var(--ib-ratio-m, var(--ib-ratio-t, var(--ib-ratio))); width: 100%; height: auto; }
  /* Match the Row Height: the block stretches to the row and the image fills it, adding no height of its own. */
  .ib-fill-m { height: 100%; align-items: stretch; }
  .ib-fill-m .image-block__item { flex: 1 1 0; display: flex; flex-direction: column; }
  .ib-fill-m.ib-w-m .image-block__item { flex: 0 1 auto; }
  .ib-fill-m .image-block__box { flex: 1 1 auto; min-height: var(--ib-h-m, var(--ib-h-t, var(--ib-h, 240px))); }
  .ib-fill-m .image-block__frame { position: absolute; inset: 0; }
  .ib-fill-m .image-block__img { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; aspect-ratio: auto; }
  :global(.sb-block:has(> .ib-fill-m)) { align-self: stretch; }
  :global(.sb-block:not(.sb-has-w):has(> .ib-fill-m)) { flex: 1 1 0; }
  .image-block { gap: var(--ib-gap-m, var(--ib-gap-t, var(--ib-gap, 16px))); }
  .image-block__item { max-width: var(--ib-maxw-m, var(--ib-maxw-t, var(--ib-maxw, 100%))); }
  .image-block__box { transform: rotate(var(--ib-rot-m, var(--ib-rot-t, var(--ib-rot, 0deg)))); }
}
</style>
