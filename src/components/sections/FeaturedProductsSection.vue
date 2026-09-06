<template>
  <section v-if="data.products?.length" class="featured-products">
    <div class="container">
      <h2 v-if="data.title" class="q-mb-md" v-html="sanitizeSectionText(data.title)" />

      <AppCarousel
          v-model="carousel.slide.value"
          :carousel-key="carousel.carouselKey.value"
          :show-controls="carousel.showControls.value"
          :total="carousel.total.value"
          :on-keydown="carousel.onKeydown"
      >
        <q-carousel-slide
            v-for="(group, index) in carousel.slideChunks.value"
            :key="index"
            :name="index"
        >
          <div class="row q-col-gutter-md">
            <div v-for="item in group" :key="item.id" class="col-12 col-sm-6 col-md-4">
              <ProductCard :product="item" />
            </div>
          </div>
        </q-carousel-slide>
      </AppCarousel>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onServerPrefetch } from 'vue'
import AppCarousel from '../app/AppCarousel.vue'
import ProductCard from '../shop/ProductCard.vue'
import { useCarousel } from 'src/composables/useCrousel.js'
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'

// Expects `data.products` to already be resolved to full product objects —
// see src/utils/resolve-sections-data.js, called from Index.vue's
// preFetch(), which turns this section's `product_ids` into real products
// server-side via productsStore.getFeaturedProducts (the same call the
// homepage's original hardcoded Featured Products block used).
const props = defineProps({
  data: {
    type: Object,
    required: true
  }
})

const carousel = useCarousel(() => props.data.products || [])
carousel.recompute()

onMounted(() => {
  carousel.markMounted()
  carousel.recompute(true)
})

onServerPrefetch(async () => {
  await carousel.recompute(true)
})
</script>