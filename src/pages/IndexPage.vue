<template>
  <div>
    <section class="hero-section-sec">
      <img
          v-if="homeSettings?.hero_image"
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
          <h1 v-if="sanitizedHeroTitle" class="stable-text" v-html="sanitizedHeroTitle"></h1>
          <p v-if="homeSettings?.hero_description" class="text-h6">{{homeSettings?.hero_description}}</p>

          <q-btn
              v-if="homeSettings?.hero_btn?.text && homeSettings.hero_btn?.url"
              title="Go to products page"
              :label="homeSettings.hero_btn.text"
              color="secondary"
              text-color="primary"
              class="btn-big"
              :to="homeSettings.hero_btn.url"
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
import { ref, onMounted, onUnmounted, computed, useSSRContext } from 'vue'
import { useRoute } from 'vue-router'
import { loadPageConfig, subscribeToLiveConfig } from 'src/utils/config-loader'
import SectionRenderer from '../components/sections/SectionRenderer.vue'
import {useSeoMeta} from "src/composables/useSeo.js";
import {getApiOrigin} from "src/utils/server/get-api-origin.js";
import {resolveHeroImageSrc} from 'src/utils/resolve-hero-image.js';
import { sanitizeHeroTitle } from 'src/utils/sanitizeHtml.js'


const route = useRoute();
let unsubscribeLiveConfig = () => {}

defineOptions({
  async preFetch({ssrContext, currentRoute}) {

    // Products are loaded by the sections that show them (useSectionData),
    // only when the homepage has such a section.

    const {fetchSeoForPath} = await import('src/composables/useSeo')

    const isPreview = currentRoute.query.preview === 'true'

    const [seo, configData] = await Promise.all([
      fetchSeoForPath('homepage', getApiOrigin(ssrContext)),
      loadPageConfig('home', isPreview, getApiOrigin(ssrContext)), // The helper we'll create
    ])

    if (configData) {
      configData.hero_image = await resolveHeroImageSrc(configData.hero_image, "homepage-hero", getApiOrigin(ssrContext))

    }

    if (ssrContext) {
      // Initialize the state object if it doesn't exist
      ssrContext.seoData = seo
      ssrContext.pageConfig = configData
      // 2. Attach it to the rendered state (for the component)
      ssrContext.heroData = {
        src: `${configData?.hero_image}`,
      }

    } else {
      window.__PAGE_CONFIG__ = configData;
      window.__SEO_DATA__ = seo;

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
  unsubscribeLiveConfig = subscribeToLiveConfig('home', (data) => { homeSettings.value = data }, {
    // Published update (new deploy): resolve the hero image like preFetch does.
    onPublished: async (data) => {
      if (data?.hero_image) data.hero_image = await resolveHeroImageSrc(data.hero_image, 'homepage-hero')
      homeSettings.value = data
    }
  })
})

onUnmounted(() => {
  unsubscribeLiveConfig()
})

</script>
<style>
@import 'src/css/home-page.css';
</style>