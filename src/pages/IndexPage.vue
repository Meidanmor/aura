<template>
  <div>
    <section class="hero-section-sec">
      <img
          fetchpriority="high"
          loading="eager"
          decoding="sync"
          alt="Homepage hero image"
          :src="`${homeSettings?.hero_image}`"
          sizes="100vw"
          width="1367"
          height="768"
          class="hero-img"
      />
      <div class="hero-section container hero-margin row">

        <div class="hero-content col-12 col-md-6 q-mb-lg">
          <h1 class="stable-text" v-html="sanitizedHeroTitle"></h1>
          <p class="text-h6">{{homeSettings?.hero_description}}</p>

          <q-btn
              title="Go to products page"
              label="Browse Products"
              color="secondary"
              text-color="primary"
              class="btn-big"
              to="/products"
          />

        </div>
      </div>
    </section>

    <!-- CMS-configurable Homepage Sections (Shop Builder plugin) — renders
         below the hero, in the order configured in wp-admin. -->
    <SectionRenderer :sections="homeSettings?.sections" />

  </div>
</template>

<script setup>
import { ref, onMounted, computed, useSSRContext } from 'vue'
import { useRoute } from 'vue-router'
import productsStore from 'src/stores/products'
import { loadPageConfig } from 'src/utils/config-loader'
import SectionRenderer from '../components/sections/SectionRenderer.vue'
import {useSeoMeta} from "src/composables/useSeo.js";
import {getApiOrigin} from "src/utils/server/get-api-origin.js";
import {resolveHeroImageSrc} from 'src/utils/resolve-hero-image.js';
import { sanitizeHeroTitle } from 'src/utils/sanitizeHtml.js'


// Static, pre-hydration featured-products list. This is the single source of
// truth for the SSR/no-JS markup and MUST match what preFetch resolved,
// otherwise the client render mismatches the server-rendered HTML.
// We do NOT fall back to deriving this from productsStore + featured_products
// ids anymore — that's what caused the mismatch when config.featured_products
// referenced stale/removed product ids. We trust preFetch's resolution
// (with its own internal fallback) as the only source for this list.
const staticFeaturedProducts = ref([])

if (process.env.CLIENT && window.__HOME_PRODUCTS_DATA__) {
  staticFeaturedProducts.value = window.__HOME_PRODUCTS_DATA__
}

const route = useRoute();

defineOptions({
  async preFetch({ssrContext, currentRoute}) {

    // Resolves the featured-products list for the homepage.
    // Tries the configured featured_products ids first; falls back to the
    // latest products if there are no ids configured, or if resolving the
    // configured ids came back empty (e.g. stale ids no longer in the catalog).
    async function resolveFeaturedProducts(featuredIds) {
      let products = featuredIds?.length
          ? await productsStore.getFeaturedProducts(featuredIds, ssrContext)
          : await productsStore.preFetchProducts({api: true, per_page: 6, dryRun: true, ssrContext}).then(r => r.products)

      if (!products?.length) {
        products = await productsStore.preFetchProducts({api: true, per_page: 6, dryRun: true, ssrContext}).then(r => r.products)
      }

      return products
    }

    const {fetchSeoForPath} = await import('src/composables/useSeo')

    const isPreview = currentRoute.query.preview === 'true'

    const [seo, configData] = await Promise.all([
      fetchSeoForPath('homepage', getApiOrigin(ssrContext)),
      loadPageConfig('home', isPreview, getApiOrigin(ssrContext)), // The helper we'll create
    ])

    if (configData) {
      configData.hero_image = await resolveHeroImageSrc(configData.hero_image, "homepage-hero", getApiOrigin(ssrContext))

    }

    const featuredIds = configData?.featured_products || []
    const leanProducts = await resolveFeaturedProducts(featuredIds)

    if (ssrContext) {
      // Initialize the state object if it doesn't exist
      ssrContext.seoData = seo
      // INJECT PRODUCTS HERE:
      ssrContext.homeProductsData = leanProducts
      ssrContext.pageConfig = configData
      // 2. Attach it to the rendered state (for the component)
      ssrContext.heroData = {
        src: `${configData?.hero_image}`,
      }

    } else {
      window.__PAGE_CONFIG__ = configData;
      window.__SEO_DATA__ = seo;
      window.__HOME_PRODUCTS_DATA__ = leanProducts

    }
  }
})

const homeSettings = ref(
    process.env.CLIENT && window.__PAGE_CONFIG__
        ? window.__PAGE_CONFIG__
        : null
)

useSeoMeta()

// 1. THE SERVER FIX (Force the HTML to populate)
if (process.env.SERVER) {
  const ssr = useSSRContext()
  homeSettings.value = ssr?.pageConfig || null
  staticFeaturedProducts.value = ssr?.homeProductsData || [];

}

const sanitizedHeroTitle = computed(() => sanitizeHeroTitle(homeSettings.value?.hero_title))

// ----------------- Mounted -----------------
onMounted(async() => {
  if (window.__PAGE_CONFIG__ && Object.keys(window.__PAGE_CONFIG__).length) {
    homeSettings.value = window.__PAGE_CONFIG__
  } else {
    const isPreview = route.query.preview === 'true'
    // Use it directly
    const freshConfig = await loadPageConfig('home', isPreview)
    if (freshConfig) {
      if(freshConfig?.hero_image){
        freshConfig.hero_image = await resolveHeroImageSrc(freshConfig.hero_image, 'homepage-hero');
      }
      homeSettings.value = freshConfig
    }
  }

})

</script>
<style>
@import 'src/css/home-page.css';
</style>