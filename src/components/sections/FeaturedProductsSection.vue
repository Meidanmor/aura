<template>
  <section v-if="products?.length" class="featured-products">
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
import { onMounted, onServerPrefetch, useSSRContext } from 'vue'
import AppCarousel from '../app/AppCarousel.vue'
import ProductCard from '../shop/ProductCard.vue'
import { useCarousel } from 'src/composables/useCrousel.js'
import { useSectionData } from 'src/composables/useSectionData.js'
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'
import productsStore from 'src/stores/products'

// `data` is this section's raw config exactly as saved by WP (product_ids,
// title) — passed straight through from home.json via SectionRenderer with
// no page-level resolution. Turning product_ids into full product objects
// is this component's own job, so it behaves identically no matter which
// page renders it.
const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  sectionId: {
    type: String,
    required: true
  }
})

const { data: products, resolve } = useSectionData(props.sectionId, (ssrContext) =>
    productsStore.getFeaturedProducts(props.data.product_ids || [], ssrContext)
)

const carousel = useCarousel(() => products.value || [])
carousel.recompute()

// Captured synchronously in setup(), per useSSRContext()'s contract — same
// pattern used elsewhere in this app (e.g. Index.vue) — rather than called
// from inside the async onServerPrefetch callback below.
let ssrContext = null
if (process.env.SERVER) {
  ssrContext = useSSRContext()
}

onServerPrefetch(async () => {
  await resolve(ssrContext)
  await carousel.recompute(true)
})

onMounted(async () => {
  carousel.markMounted()
  if (products.value === null) {
    // No SSR run produced data for this section instance — client-only
    // navigation, or this page load wasn't server-rendered. Resolve now.
    await resolve(null)
  }
  carousel.recompute(true)
})
</script>