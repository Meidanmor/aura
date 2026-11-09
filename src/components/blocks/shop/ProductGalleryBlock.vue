<template>
  <!-- A gift card: the email it sends, filled in as the shopper types, on computers in place of the
       photos or under them (the owner's choice). On phones the photos stay and the form shows the email. -->
  <GiftCardPreview v-if="p?.product && gift && giftPreview === 'replace'" :product="p.product" class="product-gallery product-gallery--gift gc-desk-only" />
  <div v-if="p?.product" class="product-gallery" :class="[`pg-${heightMode}`, { 'is-rounded': d.rounded, 'gc-phone-only': gift && giftPreview === 'replace' }]" :style="heightVars">
    <div v-if="p.gallery.length > 1" class="pg-carousel" :class="{ 'has-dots': d.show_dots !== false }">
      <!-- Scrolls natively, so a swipe follows the finger; a mouse drags it (useDragScroll). -->
      <div
          ref="trackEl"
          class="pg-track"
          tabindex="0"
          role="region"
          aria-roledescription="carousel"
          :aria-label="t('Product photos')"
          @scroll.passive="onScroll"
          @touchstart.passive="stopAiming"
          @pointerdown="stopAiming"
          @keydown="onKeydown"
          @load.capture="fitHeight"
      >
        <div
            v-for="(img, index) in p.gallery"
            :key="index"
            class="pg-slide"
            :class="img.kind === 'image' && zoom ? 'can-zoom' : ''"
            @click="img.kind === 'image' && zoom && p.openLightbox(index)"
        >
          <video
              v-if="img.kind === 'video'"
              :src="img.src"
              :aria-label="t('{name} video', { name: p.product.name })"
              controls
              playsinline
              preload="metadata"
              class="product-video"
          />
          <img
              v-else
              :src="img.src"
              :srcset="img.srcset"
              :sizes="img.sizes"
              :alt="t('{name} image {n}', { name: p.product.name, n: index })"
              :loading="index === 0 ? 'eager' : 'lazy'"
              :fetchpriority="index === 0 ? 'high' : 'auto'"
              :decoding="index === 0 ? 'sync' : 'async'"
              height="400"
              width="400"
              class="gallery-img"
              draggable="false"
          />
        </div>
      </div>

      <template v-if="d.show_arrows !== false">
        <q-btn flat dense class="pg-arrow pg-arrow--prev" :aria-label="t('Previous slide')" @click="step(-1)">
          <svg viewBox="8.59 6 7.41 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="var(--q-secondary)" d="M14.59 6L16 7.41 11.42 12l4.58 4.59L14.59 18 8.59 12z"/>
          </svg>
        </q-btn>
        <q-btn flat dense class="pg-arrow pg-arrow--next" :aria-label="t('Next slide')" @click="step(1)">
          <svg viewBox="8.59 6 7.41 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="var(--q-secondary)" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </q-btn>
      </template>

      <div v-if="d.show_dots !== false" class="pg-dots">
        <button
            v-for="(img, index) in p.gallery"
            :key="index"
            type="button"
            class="pg-dot"
            :class="{ 'is-active': index === slide }"
            :aria-label="t('Go to slide {n}', { n: index + 1 })"
            :aria-current="index === slide ? 'true' : undefined"
            @click="setSlide(index)"
        />
      </div>
    </div>

    <div v-else-if="p.gallery[0]?.kind === 'video'">
      <video
          :src="p.gallery[0].src"
          :aria-label="t('{name} video', { name: p.product.name })"
          controls
          playsinline
          preload="metadata"
          class="product-video"
      />
    </div>

    <div v-else>
      <img
          :src="p.product.images[0]?.src ? p.product.images[0].src : '/naturaBloom-circle.svg'"
          :srcset="p.product.images[0]?.srcset"
          :sizes="p.product.images[0]?.sizes"
          fetchpriority="high"
          loading="eager"
          :alt="t('{name} featured image', { name: p.product.name })"
          class="gallery-img gallery-img--single"
          :class="zoom ? 'can-zoom' : ''"
          height="400"
          width="400"
          @click="zoom && p.openLightbox(0)"
      />
    </div>
  </div>
  <GiftCardPreview v-if="p?.product && gift && giftPreview === 'below'" :product="p.product" class="product-gallery--gift gc-desk-only gc-below" />
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useDragScroll } from 'src/composables/useDragScroll.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import GiftCardPreview from 'src/components/product/GiftCardPreview.vue'
import { giftSettings } from 'src/utils/gift-card.js'

/** "Product Photos" (product page template): photos and videos in the owner's order, full screen on click. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const zoom = computed(() => d.value.zoom !== false)
// A gift card shows its email here instead of photos.
const gift = computed(() => !!giftSettings(p?.product))
const giftPreview = computed(() => (giftSettings(p?.product)?.preview === 'below' ? 'below' : 'replace'))
const trackEl = ref(null)
useDragScroll(trackEl)

const CSS_LENGTH = /^\d+(\.\d+)?(px|vh|vw|rem|em|%)$/
const lengthOf = (v) => (typeof v === 'string' && CSS_LENGTH.test(v.trim()) ? v.trim() : '')
// max: never taller than the height (how it always worked); fixed: every photo that height;
// min: at least that height; auto: each photo at its own height (full width).
const MODES = new Set(['max', 'fixed', 'min', 'auto'])
const heightMode = computed(() => (MODES.has(d.value.height_mode) ? d.value.height_mode : 'max'))
/** Photo height per screen size (--pg-h / -t / -m), 400px by default; fit and background. */
const heightVars = computed(() => {
  const v = d.value.max_height
  const map = v && typeof v === 'object' ? v : { desktop: v }
  const desk = lengthOf(map.desktop) || '400px'
  const tab = lengthOf(map.tablet) || desk
  const vars = { '--pg-h': desk, '--pg-h-t': tab, '--pg-h-m': lengthOf(map.mobile) || tab }
  vars['--pg-fit'] = d.value.fit === 'cover' ? 'cover' : 'contain'
  const bg = resolveGlobalColor(d.value.photo_bg)
  if (bg) vars['--pg-bg'] = bg
  return vars
})

const slide = computed(() => Number(p?.imagesCarousel.slide.value) || 0)
const setSlide = (index) => { if (p) p.imagesCarousel.slide.value = index }
const step = (by) => { const n = p.gallery.length; setSlide((slide.value + by + n) % n) }

// The slide follows the scroll, and the scroll follows the slide (arrows, dots, thumbnails, keys).
// While a move is on its way, the photos it passes don't count as chosen.
let aimingAt = null
let aimTimer = null
let scrolledTo = null
const stopAiming = () => { aimingAt = null; clearTimeout(aimTimer) }

function onScroll() {
  const el = trackEl.value
  if (!el || !el.clientWidth) return
  const at = Math.abs(el.scrollLeft) / el.clientWidth
  if (aimingAt !== null) {
    if (Math.abs(at - aimingAt) < 0.02) stopAiming()
    return
  }
  const index = Math.max(0, Math.min(p.gallery.length - 1, Math.round(at)))
  if (index !== slide.value) {
    scrolledTo = index
    setSlide(index)
  }
}

function scrollToSlide(index, behavior) {
  const el = trackEl.value
  if (!el) return
  const rtl = getComputedStyle(el).direction === 'rtl'
  el.scrollTo({ left: (rtl ? -1 : 1) * index * el.clientWidth, behavior })
}

// "Each photo's own height" and "at least a height": the box takes the shown photo's height.
function fitHeight() {
  const el = trackEl.value
  if (!el) return
  const own = heightMode.value === 'auto' || heightMode.value === 'min'
  const shown = el.children[slide.value]
  el.style.height = own && shown ? `${shown.offsetHeight}px` : ''
}

watch(slide, (index) => {
  // A video stops when the shopper moves to another slide.
  trackEl.value?.querySelectorAll('video').forEach((video) => video.pause())
  fitHeight()
  if (scrolledTo === index) { scrolledTo = null; return }
  scrolledTo = null
  aimingAt = index
  clearTimeout(aimTimer)
  aimTimer = setTimeout(stopAiming, 1500) // in case it never arrives (a photo's size changed on the way)
  scrollToSlide(index, window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth')
})

// Another product on the same page: back to its first photo at once.
watch(() => p?.product?.id, () => nextTick(() => {
  stopAiming()
  scrollToSlide(slide.value, 'auto')
  fitHeight()
}))

function onKeydown(e) {
  if (e.target.tagName === 'VIDEO' || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
  e.preventDefault() // the keys pick a slide instead of scrolling a little
  p.imagesCarousel.onKeydown(e)
}

// The row comes and goes with the product's photos (v-if).
let widthWatch = null
watch(trackEl, (el) => {
  widthWatch?.disconnect()
  widthWatch = null
  if (el && window.ResizeObserver) {
    widthWatch = new ResizeObserver(fitHeight)
    widthWatch.observe(el)
  }
  fitHeight()
}, { flush: 'post' })
onBeforeUnmount(() => {
  stopAiming()
  widthWatch?.disconnect()
})
</script>

<style scoped>
.gc-desk-only { display: none; }
.gc-below { margin-top: 16px; }
@media (min-width: 1024px) {
  .gc-desk-only { display: block; }
  .gc-phone-only { display: none !important; }
}
.gallery-img {
  display: block;
  max-width: 100%;
  height: 100%;
  max-height: var(--pg-h, 400px);
  object-fit: contain;
  margin: 0 auto;
}
.gallery-img--single { max-height: calc(var(--pg-h, 400px) * 1.25); }
.can-zoom, .can-zoom img { cursor: zoom-in; }
.pg-slide { max-height: var(--pg-h, 400px); }
.product-video {
  display: block;
  width: 100%;
  max-height: var(--pg-h, 400px);
  margin: 0 auto;
  background: #000;
  border-radius: 8px;
}
.is-rounded .gallery-img, .is-rounded .product-video { border-radius: 12px; }
.pg-track, .pg-slide { background: var(--pg-bg, transparent); }
.is-rounded .pg-track { border-radius: 12px; }

/* The photos in a row, one in view. */
.pg-carousel { position: relative; }
.pg-carousel.has-dots { padding-bottom: 30px; }
.pg-track {
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  transition: height .25s ease;
}
.pg-track::-webkit-scrollbar { display: none; }
.pg-track:focus-visible { outline: 2px solid var(--q-secondary); outline-offset: 2px; }
.pg-track.is-dragging, .pg-track.is-dragging * { cursor: grabbing; user-select: none; }
.pg-slide {
  flex: 0 0 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}
.pg-auto .pg-track, .pg-min .pg-track { align-items: flex-start; }
.pg-arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 1; min-width: 23px; padding: 4px; }
.has-dots .pg-arrow { top: calc(50% - 15px); }
.pg-arrow svg { display: block; width: 15px; }
.pg-arrow--prev { inset-inline-start: 0; }
.pg-arrow--next { inset-inline-end: 0; }
[dir="rtl"] .pg-arrow svg { transform: scaleX(-1); }
.pg-dots { position: absolute; inset-inline: 0; bottom: 0; display: flex; justify-content: center; }
.pg-dot { width: 12px; height: 12px; margin: 6px 4px; padding: 0; border: 0; border-radius: 50%; cursor: pointer; background: #9e9e9e; }
.pg-dot.is-active { background: var(--q-secondary); }
.pg-dot:focus-visible { outline: 2px solid var(--q-secondary); outline-offset: 2px; }

/* The same height for every photo: the box is that tall, the photo fits or fills it. */
.pg-fixed .gallery-img, .pg-fixed .product-video { width: 100%; height: var(--pg-h); max-height: none; object-fit: var(--pg-fit, contain); }
.pg-fixed .pg-slide { height: var(--pg-h); max-height: none; }
/* At least a height: taller photos keep their own height. */
.pg-min .gallery-img { width: 100%; height: auto; min-height: var(--pg-h); max-height: none; object-fit: var(--pg-fit, contain); }
.pg-min .product-video { min-height: var(--pg-h); max-height: none; }
.pg-min .pg-slide { min-height: var(--pg-h); max-height: none; }
/* Each photo's own height, the full width. */
.pg-auto .gallery-img, .pg-auto .product-video { width: 100%; height: auto; max-height: none; }
.pg-auto .pg-slide { max-height: none; }
.pg-fixed .gallery-img--single, .pg-min .gallery-img--single, .pg-auto .gallery-img--single { max-height: none; }
@media (max-width: 1023px) {
  .pg-max .gallery-img, .pg-max .product-video, .pg-max .pg-slide { max-height: var(--pg-h-t, var(--pg-h, 400px)); }
  .pg-max .gallery-img--single { max-height: calc(var(--pg-h-t, var(--pg-h, 400px)) * 1.25); }
  .pg-fixed .gallery-img, .pg-fixed .product-video, .pg-fixed .pg-slide { height: var(--pg-h-t, var(--pg-h)); }
  .pg-min .gallery-img, .pg-min .product-video, .pg-min .pg-slide { min-height: var(--pg-h-t, var(--pg-h)); }
}
@media (max-width: 767px) {
  .pg-max .gallery-img, .pg-max .product-video, .pg-max .pg-slide { max-height: var(--pg-h-m, var(--pg-h-t, var(--pg-h, 400px))); }
  .pg-max .gallery-img--single { max-height: calc(var(--pg-h-m, var(--pg-h-t, var(--pg-h, 400px))) * 1.25); }
  .pg-fixed .gallery-img, .pg-fixed .product-video, .pg-fixed .pg-slide { height: var(--pg-h-m, var(--pg-h-t, var(--pg-h))); }
  .pg-min .gallery-img, .pg-min .product-video, .pg-min .pg-slide { min-height: var(--pg-h-m, var(--pg-h-t, var(--pg-h))); }
}
</style>
