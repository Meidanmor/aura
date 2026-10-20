<template>
  <div v-if="p?.product" class="product-gallery" :class="{ 'is-rounded': d.rounded }" :style="heightVars">
    <div v-if="p.gallery.length > 1" ref="galleryEl">
      <AppCarousel
          v-model="p.imagesCarousel.slide.value"
          :carousel-key="p.imagesCarousel.carouselKey.value"
          :show-controls="p.imagesCarousel.showControls.value"
          :total="p.imagesCarousel.total.value"
          :on-keydown="p.imagesCarousel.onKeydown"
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

/** "Product Photos" (product page template): photos and videos in the owner's order, full screen on click. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const zoom = computed(() => d.value.zoom !== false)
const galleryEl = ref(null)

const CSS_LENGTH = /^\d+(\.\d+)?(px|vh|vw|rem|em|%)$/
const lengthOf = (v) => (typeof v === 'string' && CSS_LENGTH.test(v.trim()) ? v.trim() : '')
/** Photo height per screen size (--pg-h / -t / -m), 400px by default. */
const heightVars = computed(() => {
  const v = d.value.max_height
  const map = v && typeof v === 'object' ? v : { desktop: v }
  const desk = lengthOf(map.desktop) || '400px'
  const tab = lengthOf(map.tablet) || desk
  return { '--pg-h': desk, '--pg-h-t': tab, '--pg-h-m': lengthOf(map.mobile) || tab }
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
@media (max-width: 1023px) {
  .gallery-img, .product-video, .product-gallery :deep(.q-carousel__slide) { max-height: var(--pg-h-t, 400px); }
  .gallery-img--single { max-height: calc(var(--pg-h-t, 400px) * 1.25); }
}
@media (max-width: 767px) {
  .gallery-img, .product-video, .product-gallery :deep(.q-carousel__slide) { max-height: var(--pg-h-m, 400px); }
  .gallery-img--single { max-height: calc(var(--pg-h-m, 400px) * 1.25); }
}
</style>
