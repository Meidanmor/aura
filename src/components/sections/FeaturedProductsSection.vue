<template>
  <div v-if="products?.length" :style="cssVars" class="featured-products">
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
          <div class="row full-width no-wrap">
            <div v-for="item in group" :key="item.id"
                 class="slide-container"
            >
              <ProductCard :product="item" />
            </div>
          </div>
        </q-carousel-slide>
      </AppCarousel>
  </div>
</template>

<script setup>
import {computed, onMounted, onServerPrefetch, useSSRContext, watch} from 'vue'
import {onBeforeRouteLeave} from "vue-router";
import AppCarousel from '../app/AppCarousel.vue'
import ProductCard from '../shop/ProductCard.vue'
import { useCarousel } from 'src/composables/useCrousel.js'
import { useSectionData } from 'src/composables/useSectionData.js'
import productsStore from 'src/stores/products'

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
  const ids = props.data.data.product_ids || []

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


// A getter, so a changed "Products Per Slide" (Live Preview) is re-read.
const perView = () => props.data.data.items_per_view || {}
const carousel = useCarousel(() => products.value || [], { perView })
carousel.recompute()

const cssVars = computed(() => {
  const vars = {}
  vars['--slides'] = carousel.activeChunkSize.value
  return vars
})

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
    [() => products.value, () => carousel.device.value, () => JSON.stringify(perView())],
    () => {
      carousel.markMounted()
      carousel.recompute(true)    // forceRemount now safely diverges from SSR output
    }
)
// Live preview: re-resolve when the admin changes the picked products.
const stopIdsWatch = watch(
    () => (props.data.data.product_ids || []).join(','),
    async (next, prev) => {
      if (next !== prev) await resolve(null)
    }
)

onBeforeRouteLeave(() => {
  stopProductsWatch()
  stopIdsWatch()
})

</script>