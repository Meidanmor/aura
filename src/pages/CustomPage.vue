<template>
  <ErrorNotFound v-if="notFound" />
  <div v-else-if="page" class="custom-page">
    <div v-if="page.crumbs?.length || (page.show_title !== false && page.title)" class="container">
      <!-- A page inside other pages: the trail back up (Home › About › Team). -->
      <q-breadcrumbs v-if="page.crumbs?.length" class="custom-page-crumbs">
        <q-breadcrumbs-el label="Home" to="/" />
        <q-breadcrumbs-el v-for="c in page.crumbs" :key="c.path" :label="c.title" :to="`/${c.path}`" />
        <q-breadcrumbs-el :label="page.title" />
      </q-breadcrumbs>
      <h1 v-if="page.show_title !== false && page.title" class="custom-page-title">{{ page.title }}</h1>
    </div>
    <SectionRenderer :sections="page.sections" page="custom" />
  </div>
  <div v-else class="q-pa-xl flex flex-center">
    <q-spinner color="secondary" size="3em" />
  </div>
</template>

<script>
/**
 * The store owner's own pages (/about, /about/team…), built in the dashboard
 * (Design → Pages) and published as /config/pages.json (the list) and
 * /config/page-{id}.json (each page). Routes the app itself has (/cart,
 * /products, /product/…) always win: they're static routes, this is the
 * dynamic one.
 */
import { loadPageConfig } from 'src/utils/config-loader.js'
import { fetchSeoForPath } from 'src/composables/useSeo.js'

// Addresses come encoded ("%d7%90…") from the store and decoded from the
// router: compare them decoded, without slashes at either end.
export const plain = (s) => {
  let text = String(s || '')
  try {
    text = decodeURIComponent(text)
  } catch { /* keep it as it is */ }
  return text.toLowerCase().replace(/^\/+|\/+$/g, '')
}
// Pages published before pages had parents have a slug and no path.
const pathOf = (p) => p.path || p.slug || ''

/** The owner's homepage (the page with role "home", at "/"), or null. */
export async function homePageOf(origin = '') {
  const list = await loadPageConfig('pages', false, origin)
  const entry = (list?.pages || []).find((p) => p.role === 'home')
  if (!entry) return null
  const page = await loadPageConfig(`page-${entry.id}`, false, origin)
  return page?.sections ? page : null
}

/** The published page at an address, or null. */
export async function pageAt(path, origin = '') {
  const list = await loadPageConfig('pages', false, origin)
  const entry = (list?.pages || []).find((p) => plain(pathOf(p)) === plain(path))
  if (!entry) return null
  const page = await loadPageConfig(`page-${entry.id}`, false, origin)
  return page?.sections ? page : null
}
</script>

<script setup>
import { computed, onMounted, onUnmounted, ref, useSSRContext, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SectionRenderer from 'components/sections/SectionRenderer.vue'
import ErrorNotFound from 'pages/ErrorNotFound.vue'
import { isEditorMode, onPublishedConfigUpdate, subscribeToLiveConfig } from 'src/utils/config-loader.js'
import { getApiOrigin } from 'src/utils/server/get-api-origin.js'
import { useSeoMeta } from 'src/composables/useSeo.js'

defineOptions({
  async preFetch({ ssrContext, currentRoute, redirect }) {
    const origin = getApiOrigin(ssrContext)
    const path = currentRoute.params.pagePath
    const [page, seo] = await Promise.all([pageAt(path, origin), fetchSeoForPath(path, origin)])
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
const here = computed(() => route.params.pagePath)
const page = ref(null)
const notFound = ref(false)
const { seoData } = useSeoMeta()

if (process.env.SERVER) {
  const ssr = useSSRContext()
  page.value = ssr?.pageConfig?.sections ? ssr.pageConfig : null
  // (The live preview shows draft pages the storefront doesn't have yet: the client takes over there.)
  notFound.value = !page.value
}
if (process.env.CLIENT) {
  const data = window.__PAGE_CONFIG__
  if (data?.sections && plain(pathOf(data)) === plain(here.value)) page.value = data
  else if (!isEditorMode() && window.__SEO_DATA__?.not_found) notFound.value = true
}

// In the app: show the page as soon as its file is here; the SEO tags follow.
async function load(path) {
  const seo = fetchSeoForPath(path)
  const found = await pageAt(path)
  if (plain(here.value) !== plain(path)) return // the visitor moved on
  if (found) {
    page.value = found
    seo.then((s) => plain(here.value) === plain(path) && (seoData.value = s))
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
  if (!page.value && !notFound.value && !isEditorMode()) load(here.value)
  // Live preview: the dashboard sends every page's draft; show this one.
  unsubscribe = subscribeToLiveConfig('custom_pages', (pages) => {
    const draft = (Array.isArray(pages) ? pages : []).find((p) => plain(pathOf(p)) === plain(here.value))
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
watch(here, (path, before) => {
  if (path && path !== before) {
    page.value = null
    notFound.value = false
    load(path)
  }
})
</script>

<style scoped>
.custom-page-crumbs {
  margin: 24px 0 0;
  font-size: 14px;
}
.custom-page-title {
  margin: 32px 0 8px;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.2;
}
.custom-page-crumbs + .custom-page-title {
  margin-top: 12px;
}
</style>
