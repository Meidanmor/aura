<template>
    <div :style="cssVars" v-if="props.data.data.items?.length" class="container testimonials-section">
      <h2 v-if="data.title" class="q-mb-lg text-center" v-html="sanitizeSectionText(data.title)" />

      <AppCarousel
          v-if="isCarousel"
          v-model="carousel.slide.value"
          :carousel-key="carousel.carouselKey.value"
          :show-controls="carousel.showControls.value"
          :total="carousel.total.value"
          :on-keydown="carousel.onKeydown"
      >
        <q-carousel-slide
            v-for="(group, slideIndex) in carousel.slideChunks.value"
            :key="slideIndex"
            :name="slideIndex"
        >
          <div class="row full-width no-wrap">
            <div
                class="slide-container"
                v-for="(testimonial, index) in group"
                :key="index"
            >
              <TestimonialCard :testimonial="testimonial" />
            </div>
          </div>

        </q-carousel-slide>
      </AppCarousel>

      <!-- Grid: columns per device come from "Items Per Row / Slide" -->
      <div v-else class="testimonials-grid">
        <TestimonialCard
            v-for="(testimonial, index) in props.data.data.items"
            :key="index"
            :testimonial="testimonial"
        />
      </div>
    </div>
</template>

<script setup>
import {computed, onMounted, onServerPrefetch, watch} from 'vue'
import AppCarousel from '../app/AppCarousel.vue'
import TestimonialCard from './TestimonialCard.vue'
import { useCarousel } from 'src/composables/useCrousel.js'
import { setResponsiveVar } from 'src/composables/useSectionStyle.js'
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  blockId: { type: String, default: '' },
})


const isCarousel = computed(() => props.data.data.display_style === 'carousel')

// A getter, so a changed "Items Per Row / Slide" (Live Preview) is re-read.
const perView = () => props.data.data.items_per_view || {}

// Always call the composable (never conditionally — same rule as any other
// Vue hook) even though its output is only used when isCarousel is true;
// the cost of chunking an unused array is negligible.
const carousel = useCarousel(() => props.data.data.items || [], { perView })
carousel.recompute()


const cssVars = computed(() => {
  const vars = {}
  vars['--slides'] = carousel.activeChunkSize.value
  // Grid columns per device (--tg-cols / -t / -m)
  setResponsiveVar(vars, '--tg-cols', perView(), (v) => (v ? Math.max(1, Math.min(6, Number(v))) : null))
  return vars
})
onMounted(() => {
  carousel.markMounted()
  carousel.recompute(true) // forceRemount, same as the homepage's other carousels
})
onServerPrefetch(async () => {
  await carousel.recompute(true)
})
watch(
    [() => props.data.data.items, () => carousel.device.value, () => JSON.stringify(perView())],
    () => {
      carousel.markMounted()
      carousel.recompute(true)    // forceRemount now safely diverges from SSR output
    }
)

</script>

<style scoped>
.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(var(--tg-cols, 3), minmax(0, 1fr));
  gap: 16px;
}
@media (max-width: 1023px) {
  .testimonials-grid { grid-template-columns: repeat(var(--tg-cols-t, 2), minmax(0, 1fr)); }
}
@media (max-width: 767px) {
  .testimonials-grid { grid-template-columns: repeat(var(--tg-cols-m, 1), minmax(0, 1fr)); }
}
</style>
