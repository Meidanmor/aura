<template>
  <div v-if="p?.product" class="product-gallery" :class="[`pg-${heightMode}`, { 'is-rounded': d.rounded }]" :style="heightVars">
    <div v-if="p.gallery.length > 1" ref="galleryEl">
      <AppCarousel
          v-model="p.imagesCarousel.slide.value"
          :carousel-key="p.imagesCarousel.carouselKey.value"
          :show-controls="p.imagesCarousel.showControls.value"
          :total="p.imagesCarousel.total.value"
          :on-keydown="p.imagesCarousel.onKeydown"
          :arrows="d.show_arrows !== false"
          :dots="d.show_dots !== false"
      >
        <q-carousel-slide
            v-for="(img, index) in p.gallery"
            :key="index"
            :name="index"
            :class="img.kind === 'image' && zoom ? 'can-zoom' : ''"
            @mousedown="p.onImageMouseDown"
            @mousemove="p.onImageMouseMove"
            @click="img.kind === 'image' && zoom && p.onImageClick(index)"
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
          />
        </q-carousel-slide>
      </AppCarousel>
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
          @mousedown="p.onImageMouseDown"
          @mousemove="p.onImageMouseMove"
          @click="zoom && p.onImageClick(0)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, inject, ref, watch } from 'vue'
import AppCarousel from 'src/components/app/AppCarousel.vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'

/** "Product Photos" (product page template): photos and videos in the owner's order, full screen on click. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const zoom = computed(() => d.value.zoom !== false)
const galleryEl = ref(null)

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

// A video stops when the shopper moves to another slide.
watch(() => p?.imagesCarousel.slide.value, () => {
  galleryEl.value?.querySelectorAll('video').forEach((video) => video.pause())
})
</script>

<style scoped>
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
.product-gallery :deep(.q-carousel__slide) { max-height: var(--pg-h, 400px); }
.product-video {
  display: block;
  width: 100%;
  max-height: var(--pg-h, 400px);
  margin: 0 auto;
  background: #000;
  border-radius: 8px;
}
.is-rounded .gallery-img, .is-rounded .product-video { border-radius: 12px; }
.product-gallery :deep(.q-carousel), .product-gallery :deep(.q-carousel__slide) { background: var(--pg-bg, transparent); }
.is-rounded :deep(.q-carousel) { border-radius: 12px; overflow: hidden; }

/* The same height for every photo: the box is that tall, the photo fits or fills it. */
.pg-fixed .gallery-img, .pg-fixed .product-video { width: 100%; height: var(--pg-h); max-height: none; object-fit: var(--pg-fit, contain); }
.pg-fixed :deep(.q-carousel__slide) { height: var(--pg-h); max-height: none; }
/* At least a height: taller photos keep their own height. */
.pg-min .gallery-img { width: 100%; height: auto; min-height: var(--pg-h); max-height: none; object-fit: var(--pg-fit, contain); }
.pg-min .product-video { min-height: var(--pg-h); max-height: none; }
.pg-min :deep(.q-carousel__slide) { min-height: var(--pg-h); max-height: none; display: flex; align-items: center; }
/* Each photo's own height, the full width. */
.pg-auto .gallery-img, .pg-auto .product-video { width: 100%; height: auto; max-height: none; }
.pg-auto :deep(.q-carousel__slide) { max-height: none; }
.pg-fixed .gallery-img--single, .pg-min .gallery-img--single, .pg-auto .gallery-img--single { max-height: none; }
@media (max-width: 1023px) {
  .pg-max .gallery-img, .pg-max .product-video, .pg-max :deep(.q-carousel__slide) { max-height: var(--pg-h-t, 400px); }
  .pg-max .gallery-img--single { max-height: calc(var(--pg-h-t, 400px) * 1.25); }
  .pg-fixed .gallery-img, .pg-fixed .product-video, .pg-fixed :deep(.q-carousel__slide) { height: var(--pg-h-t); }
  .pg-min .gallery-img, .pg-min .product-video, .pg-min :deep(.q-carousel__slide) { min-height: var(--pg-h-t); }
}
@media (max-width: 767px) {
  .pg-max .gallery-img, .pg-max .product-video, .pg-max :deep(.q-carousel__slide) { max-height: var(--pg-h-m, 400px); }
  .pg-max .gallery-img--single { max-height: calc(var(--pg-h-m, 400px) * 1.25); }
  .pg-fixed .gallery-img, .pg-fixed .product-video, .pg-fixed :deep(.q-carousel__slide) { height: var(--pg-h-m); }
  .pg-min .gallery-img, .pg-min .product-video, .pg-min :deep(.q-carousel__slide) { min-height: var(--pg-h-m); }
}
</style>
