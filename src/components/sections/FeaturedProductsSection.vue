<template>
  <div v-if="products?.length" class="featured-products">
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
  </div>
</template>

<script setup>
import {onMounted, onServerPrefetch, useSSRContext, watch} from 'vue'
import {onBeforeRouteLeave} from "vue-router";
import {useQuasar} from "quasar";
import AppCarousel from '../app/AppCarousel.vue'
import ProductCard from '../shop/ProductCard.vue'
import { useCarousel } from 'src/composables/useCrousel.js'
import { useSectionData } from 'src/composables/useSectionData.js'
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'
import productsStore from 'src/stores/products'

const $q = useQuasar();
const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  blockId: {
    type: String,
    required: true
  },
})

// Mirrors Index.vue's resolveFeaturedProducts: try the admin-configured
// product_ids first, and fall back to the latest 6 products if there are
// no ids configured, or if resolving the configured ids came back empty
// (e.g. stale ids no longer in the catalog).
async function resolveFeaturedProducts(ssrContext) {
  const ids = props.data.product_ids || []

  let items = ids.length
      ? await productsStore.getFeaturedProducts(ids, ssrContext)
      : []

  if (!items?.length) {
    items = await productsStore
        .preFetchProducts({ api: true, per_page: 6, dryRun: true, ssrContext })
        .then((r) => r.products)
  }

  return items
}

const { data: products, resolve } = useSectionData(props.blockId, resolveFeaturedProducts)


const perView = props.data.items_per_view || {}
const carousel = useCarousel(() => products.value || [], {
  chunkSizes: {
    xs: perView.mobile || 1,
    sm: perView.tablet || 2,
    md: perView.desktop || 3
  }
})
carousel.recompute()

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
    await resolve(null)
  }
  carousel.recompute(true)
})
const stopProductsWatch = watch(
    [() => products.value, () => $q.screen.name],
    () => {
      carousel.markMounted()
      carousel.recompute(true)    // forceRemount now safely diverges from SSR output
    }
)
onBeforeRouteLeave(() => {
  stopProductsWatch()
})

</script>