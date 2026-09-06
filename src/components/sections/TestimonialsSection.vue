<template>
  <section v-if="data.items?.length" class="testimonials-section">
    <div class="container">
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
          <div class="row q-col-gutter-md">
            <div
                class="col-12 col-md-4"
                v-for="(testimonial, index) in group"
                :key="index"
            >
              <TestimonialCard :testimonial="testimonial" />
            </div>
          </div>
        </q-carousel-slide>
      </AppCarousel>

      <div v-else class="row q-col-gutter-md">
        <div
            class="col-12 col-md-4"
            v-for="(testimonial, index) in data.items"
            :key="index"
        >
          <TestimonialCard :testimonial="testimonial" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onServerPrefetch } from 'vue'
import AppCarousel from '../app/AppCarousel.vue'
import TestimonialCard from './TestimonialCard.vue'
import { useCarousel } from 'src/composables/useCrousel.js'
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'

const props = defineProps({
  data: {
    type: Object,
    required: true
  }
})

const isCarousel = computed(() => props.data.display_style === 'carousel')

// Always call the composable (never conditionally — same rule as any other
// Vue hook) even though its output is only used when isCarousel is true;
// the cost of chunking an unused array is negligible.
const carousel = useCarousel(() => props.data.items || [])
carousel.recompute()

onMounted(() => {
  carousel.markMounted()
  carousel.recompute(true) // forceRemount, same as the homepage's other carousels
})

onServerPrefetch(async () => {
  await carousel.recompute(true)
})
</script>