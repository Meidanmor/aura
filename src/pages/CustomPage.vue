<template>
  <ErrorNotFound v-if="notFound" />
  <div v-else-if="page" class="custom-page">
    <div v-if="page.show_title !== false && page.title" class="container">
      <h1 class="custom-page-title">{{ page.title }}</h1>
    </div>
    <SectionRenderer :sections="page.sections" page="custom" />
  </div>
  <div v-else class="q-pa-xl flex flex-center">
    <q-spinner color="secondary" size="3em" />
  </div>
</template>

<script>
/**
 * The store owner's own pages (/about, /shipping…), built in the dashboard
 * (Design → Pages) and published as /config/pages.json (the list) and
 * /config/page-{id}.json (each page). Routes the app itself has (/cart,
 * /products…) always win: they're static routes, this is the dynamic one.
 */
import { loadPageConfig } from 'src/utils/config-loader.js'
import { fetchSeoForPath } from 'src/composables/useSeo.js'

// Slugs come encoded ("%d7%90…") from the store and decoded from the router: compare decoded.
export const plain = (s) => {
  try {
    return decodeURIComponent(String(s || '')).toLowerCase()
  } catch {
    return String(s || '').toLowerCase()
  }
}

/** { page, seo } for a slug, or { seo } with not_found / redirect. */
export async function findPage(slug, origin = '') {
  const [list, seo] = await Promise.all([loadPageConfig('pages', false, origin), fetchSeoForPath(slug, origin)])
  const entry = (list?.pages || []).find((p) => plain(p.slug) === plain(slug))
  if (!entry) return { page: null, seo }
  const page = await loadPageConfig(`page-${entry.id}`, false, origin)
  return { page: page?.sections ? page : null, seo }
}
</script>

<script setup>
import { onMounted, onUnmounted, ref, useSSRContext, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SectionRenderer from 'components/sections/SectionRenderer.vue'
import ErrorNotFound from 'pages/ErrorNotFound.vue'
import { isEditorMode, onPublishedConfigUpdate, subscribeToLiveConfig } from 'src/utils/config-loader.js'
import { getApiOrigin } from 'src/utils/server/get-api-origin.js'
import { useSeoMeta } from 'src/composables/useSeo.js'

defineOptions({
  async preFetch({ ssrContext, currentRoute, redirect }) {
    const { page, seo } = await findPage(currentRoute.params.pageSlug, getApiOrigin(ssrContext))
    // The owner moved the page: send visitors and search engines to its new address.
    if (!page && seo.redirect) {
      redirect(seo.redirect, 301)
      return
    }
    if (ssrContext) {
      ssrContext.pageConfig = page || {}
      ssrContext.seoData = page ? seo : { ...seo, robots: 'noindex, nofollow', not_found: true }
    } else {
      window.__PAGE_CONFIG__ = page || {}
      window.__SEO_DATA__ = seo
    }
  },
})

const route = useRoute()
const router = useRouter()
const page = ref(null)
const notFound = ref(false)
const { seoData } = useSeoMeta()

if (process.env.SERVER) {
  const ssr = useSSRContext()
  page.value = ssr?.pageConfig?.sections ? ssr.pageConfig : null
  // The live preview shows a draft page the storefront doesn't have yet: no 404 there.
  notFound.value = !page.value
}
if (process.env.CLIENT) {
  const data = window.__PAGE_CONFIG__
  if (data?.sections && plain(data.slug) === plain(route.params.pageSlug)) page.value = data
  else if (!isEditorMode() && window.__SEO_DATA__?.not_found) notFound.value = true
}

// In the app: show the page as soon as its file is here; the SEO tags follow.
async function load(slug) {
  const seo = fetchSeoForPath(slug)
  const list = await loadPageConfig('pages', false)
  const entry = (list?.pages || []).find((p) => plain(p.slug) === plain(slug))
  const found = entry ? await loadPageConfig(`page-${entry.id}`, false) : null
  if (plain(route.params.pageSlug) !== plain(slug)) return // the visitor moved on
  if (found?.sections) {
    page.value = found
    seo.then((s) => plain(route.params.pageSlug) === plain(slug) && (seoData.value = s))
    return
  }
  const answer = await seo
  if (answer.redirect) return router.replace(answer.redirect)
  page.value = null
  notFound.value = !isEditorMode()
  seoData.value = answer
}

let unsubscribe = () => {}
let unsubscribePublished = () => {}
onMounted(() => {
  if (!page.value && !notFound.value && !isEditorMode()) load(route.params.pageSlug)
  // Live preview: the dashboard sends every page's draft; show this one.
  unsubscribe = subscribeToLiveConfig('custom_pages', (pages) => {
    const draft = (Array.isArray(pages) ? pages : []).find((p) => plain(p.slug) === plain(route.params.pageSlug))
    if (draft) {
      page.value = draft
      notFound.value = false
    }
  })
  if (page.value?.id) {
    unsubscribePublished = onPublishedConfigUpdate(`page-${page.value.id}`, (data) => (page.value = data))
  }
})
onUnmounted(() => {
  unsubscribe()
  unsubscribePublished()
})

// From one page to another: the component stays, so load the new one.
watch(
  () => route.params.pageSlug,
  (slug, before) => {
    if (slug && slug !== before) {
      page.value = null
      notFound.value = false
      load(slug)
    }
  },
)
</script>

<style scoped>
.custom-page-title {
  margin: 32px 0 8px;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.2;
}
</style>
