<template>
    <div :style="cssVars" v-if="data.items?.length" class="container testimonials-section">
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
</template>

<script setup>
import {computed, onMounted, onServerPrefetch, watch} from 'vue'
import AppCarousel from '../app/AppCarousel.vue'
import {useQuasar} from "quasar";
import TestimonialCard from './TestimonialCard.vue'
import { useCarousel } from 'src/composables/useCrousel.js'
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'
import {onBeforeRouteLeave} from "vue-router";

const $q = useQuasar()
const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  blockId: { type: String, default: '' },
})


const isCarousel = computed(() => props.data.display_style === 'carousel')

// Always call the composable (never conditionally — same rule as any other
// Vue hook) even though its output is only used when isCarousel is true;
// the cost of chunking an unused array is negligible.
const carousel = useCarousel(() => props.data.items || [])
carousel.recompute()


const cssVars = computed(() => {
  const vars = {}
  vars['--slides'] = carousel.activeChunkSize.value
  return vars
})
onMounted(() => {
  carousel.markMounted()
  carousel.recompute(true) // forceRemount, same as the homepage's other carousels
})
onServerPrefetch(async () => {
  await carousel.recompute(true)
})
const stopTestimonialsWatch = watch(
    [() => props.data.items, () => $q.screen.name],
    () => {
      carousel.markMounted()
      carousel.recompute(true)    // forceRemount now safely diverges from SSR output
    }
)
onBeforeRouteLeave(() => {
  stopTestimonialsWatch()
})

</script>