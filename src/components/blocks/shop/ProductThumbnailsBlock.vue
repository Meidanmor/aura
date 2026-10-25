<template>
  <div
      v-if="p?.product && p.gallery.length > 1"
      ref="listEl"
      class="product-thumbs"
      :class="[dirClasses, { 'pt-dim': d.dim !== false, 'pt-limit': limit > 0 }]"
      :style="vars"
      role="group"
      :aria-label="t('Product photos')"
  >
    <button
        v-for="(img, index) in p.gallery"
        :key="index"
        type="button"
        class="pt-item"
        :class="{ 'is-active': index === active }"
        :aria-label="t('Show photo {n}', { n: index + 1 })"
        :aria-current="index === active ? 'true' : undefined"
        @click="go(index)"
    >
      <span v-if="img.kind === 'video'" class="pt-video" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z" /></svg>
      </span>
      <img
          v-else
          :src="img.thumbnail || img.src"
          alt=""
          loading="lazy"
          decoding="async"
          width="80"
          height="80"
      >
    </button>
  </div>
</template>

<script setup>
import { computed, inject, nextTick, ref, watch } from 'vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { alignToFlex, asResponsive, setResponsiveVar, toCssLength, DEVICES } from 'src/composables/useSectionStyle.js'

/**
 * "Product Thumbnails" (product page template): small photos that pick the
 * Product Photos block's slide. A row or a column per screen size, so the owner
 * puts it above, below or beside the photos.
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const listEl = ref(null)
const active = computed(() => Number(p?.imagesCarousel.slide.value) || 0)
const limit = computed(() => Math.max(0, Math.min(20, Number(d.value.max_visible) || 0)))

const go = (index) => { if (p) p.imagesCarousel.slide.value = index }

const SHORT = { desktop: 'd', tablet: 't', mobile: 'm' }
const dirClasses = computed(() => {
  const r = asResponsive(d.value.direction || 'row')
  const c = {}
  for (const device of DEVICES) c[`pt-${SHORT[device]}-${r[device] === 'column' ? 'column' : 'row'}`] = true
  return c
})

const RATIOS = { square: '1 / 1', portrait: '3 / 4', landscape: '4 / 3' }
const HEIGHT_OF = { square: 1, portrait: 4 / 3, landscape: 3 / 4 }
const vars = computed(() => {
  const v = {}
  setResponsiveVar(v, '--pt-s', d.value.size, toCssLength)
  setResponsiveVar(v, '--pt-gap', d.value.gap, toCssLength)
  v['--pt-ratio'] = RATIOS[d.value.ratio] || RATIOS.square
  v['--pt-hf'] = String(HEIGHT_OF[d.value.ratio] || 1) // thumbnail height / width
  v['--pt-fit'] = d.value.fit === 'contain' ? 'contain' : 'cover'
  if (limit.value) v['--pt-n'] = String(limit.value)
  const r = toCssLength(d.value.radius)
  if (r) v['--pt-r'] = r
  const bg = resolveGlobalColor(d.value.bg)
  if (bg) v['--pt-bg'] = bg
  const border = resolveGlobalColor(d.value.border_color)
  if (border) v['--pt-border'] = border
  const ac = resolveGlobalColor(d.value.active_color || 'global:secondary')
  if (ac) v['--pt-active'] = ac
  const aw = toCssLength(d.value.active_width)
  if (aw) v['--pt-aw'] = aw
  v['--pt-align'] = alignToFlex(d.value.align || 'default') || 'flex-start'
  return v
})

// Keep the chosen thumbnail in view inside its own scroller (never scrolls the page).
watch(active, async (i) => {
  await nextTick()
  const box = listEl.value
  const item = box?.children[i]
  if (!box || !item || box.scrollWidth <= box.clientWidth && box.scrollHeight <= box.clientHeight) return
  const b = box.getBoundingClientRect()
  const r = item.getBoundingClientRect()
  if (r.left < b.left) box.scrollLeft -= b.left - r.left
  else if (r.right > b.right) box.scrollLeft += r.right - b.right
  if (r.top < b.top) box.scrollTop -= b.top - r.top
  else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom
})
</script>

<style scoped>
.product-thumbs {
  --pt-size: var(--pt-s, 72px);
  --pt-g: var(--pt-gap, 8px);
  display: flex; flex-wrap: wrap; gap: var(--pt-g); justify-content: var(--pt-align, flex-start);
  scrollbar-width: thin;
}
.pt-item {
  position: relative; flex: none; width: var(--pt-size); aspect-ratio: var(--pt-ratio, 1 / 1); padding: 0; overflow: hidden; cursor: pointer;
  border: 1px solid var(--pt-border, transparent); border-radius: var(--pt-r, 8px); background: var(--pt-bg, #f3f3f3);
  transition: opacity .2s ease;
}
.pt-item img { display: block; width: 100%; height: 100%; object-fit: var(--pt-fit, cover); }
/* The chosen one's border, drawn over the photo. */
.pt-item::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  box-shadow: inset 0 0 0 var(--pt-aw, 2px) var(--pt-active, var(--q-secondary)); opacity: 0; transition: opacity .2s ease;
}
.pt-item.is-active::after { opacity: 1; }
.pt-dim .pt-item:not(.is-active) { opacity: .6; }
.pt-dim .pt-item:not(.is-active):hover { opacity: .9; }
.pt-item:focus-visible { outline: 2px solid var(--pt-active, var(--q-secondary)); outline-offset: 2px; }
.pt-video { display: grid; place-items: center; width: 100%; height: 100%; background: #111; color: #fff; }
.pt-video svg { width: 40%; height: 40%; }

/* A row / a column per screen size; with "Thumbnails before scrolling" they scroll after that many. */
@media (min-width: 1024px) {
  .pt-d-column { flex-direction: column; flex-wrap: nowrap; align-items: var(--pt-align, flex-start); }
  .pt-limit.pt-d-row { flex-wrap: nowrap; overflow-x: auto; max-width: calc(var(--pt-n) * var(--pt-size) + (var(--pt-n) - 1) * var(--pt-g)); }
  .pt-limit.pt-d-column { overflow-y: auto; max-height: calc(var(--pt-n) * var(--pt-size) * var(--pt-hf, 1) + (var(--pt-n) - 1) * var(--pt-g)); }
}
@media (max-width: 1023px) {
  .product-thumbs { --pt-size: var(--pt-s-t, var(--pt-s, 72px)); --pt-g: var(--pt-gap-t, var(--pt-gap, 8px)); }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .pt-t-column { flex-direction: column; flex-wrap: nowrap; align-items: var(--pt-align, flex-start); }
  .pt-limit.pt-t-row { flex-wrap: nowrap; overflow-x: auto; max-width: calc(var(--pt-n) * var(--pt-size) + (var(--pt-n) - 1) * var(--pt-g)); }
  .pt-limit.pt-t-column { overflow-y: auto; max-height: calc(var(--pt-n) * var(--pt-size) * var(--pt-hf, 1) + (var(--pt-n) - 1) * var(--pt-g)); }
}
@media (max-width: 767px) {
  .product-thumbs { --pt-size: var(--pt-s-m, var(--pt-s-t, var(--pt-s, 64px))); --pt-g: var(--pt-gap-m, var(--pt-gap-t, var(--pt-gap, 8px))); }
}
@media (max-width: 767px) {
  .pt-m-column { flex-direction: column; flex-wrap: nowrap; align-items: var(--pt-align, flex-start); }
  .pt-limit.pt-m-row { flex-wrap: nowrap; overflow-x: auto; max-width: calc(var(--pt-n) * var(--pt-size) + (var(--pt-n) - 1) * var(--pt-g)); }
  .pt-limit.pt-m-column { overflow-y: auto; max-height: calc(var(--pt-n) * var(--pt-size) * var(--pt-hf, 1) + (var(--pt-n) - 1) * var(--pt-g)); }
}
</style>
