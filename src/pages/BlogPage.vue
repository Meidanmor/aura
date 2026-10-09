<template>
  <ErrorNotFound v-if="notFound" />
  <div v-else-if="!data && !error" class="q-pa-xl flex justify-center"><q-spinner color="secondary" size="3em" /></div>
  <div v-else class="blog-page">
    <p v-if="error" class="text-negative q-pa-md">{{ error }}</p>
    <SectionRenderer v-else :sections="sections" page="blog" />
  </div>
</template>

<script>
import { fetchBlogList } from 'src/api/blog.js'
import { fetchSeoForPath } from 'src/composables/useSeo.js'
import { getApiOrigin } from 'src/utils/server/get-api-origin.js'
import { loadPageConfig } from 'src/utils/config-loader.js'
import { blogCategoryMatch, pickSections } from 'src/utils/layouts.js'
import { DEFAULT_BLOG_SECTIONS, postsPerPage } from 'src/utils/blog-templates.js'

const keyOf = (category, page) => `list|${category}|${page}`
const pathOf = (category) => (category ? `blog/category/${category}` : 'blog')

/** The template's sections for a category ('' = /blog): its layout, the default, or the built-in one. */
export function blogSections(config, category) {
  const own = config && ((config.sections || []).length || (config.layouts || []).length || config.preview_layout !== undefined)
  return own ? pickSections(config, blogCategoryMatch(category)) : DEFAULT_BLOG_SECTIONS
}

/** The posts (as many per page as the template's posts grid shows), the search listing and the template. */
export async function loadBlogList(route, origin = '') {
  const category = String(route.params.category || '')
  const page = Math.max(1, Number(route.query.page) || 1)
  const config = await loadPageConfig('blog', false, origin).catch(() => null)
  const [data, seo] = await Promise.all([
    fetchBlogList({ page, category, perPage: postsPerPage(blogSections(config, category)) }, origin).catch(() => undefined),
    fetchSeoForPath(pathOf(category), origin),
  ])
  // null: the category doesn't exist (404); undefined: the store didn't answer.
  return { blog: { key: keyOf(category, page), data: data ?? null, missing: data === null, config: config || null }, seo }
}
</script>

<script setup>
import { computed, onMounted, onUnmounted, provide, ref, useSSRContext, watch } from 'vue'
import { useRoute } from 'vue-router'
import ErrorNotFound from 'pages/ErrorNotFound.vue'
import SectionRenderer from 'components/sections/SectionRenderer.vue'
import { useSeoMeta } from 'src/composables/useSeo.js'
import { subscribeToLiveConfig } from 'src/utils/config-loader.js'

defineOptions({
  async preFetch({ ssrContext, currentRoute }) {
    const { blog, seo } = await loadBlogList(currentRoute, getApiOrigin(ssrContext))
    if (ssrContext) {
      ssrContext.blogData = blog
      ssrContext.seoData = blog.missing ? { ...seo, robots: 'noindex, nofollow', not_found: true } : seo
    } else {
      window.__BLOG_DATA__ = blog
      window.__SEO_DATA__ = seo
    }
  },
})

const route = useRoute()
const category = computed(() => String(route.params.category || ''))
const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const data = ref(null)
const config = ref(null)
const notFound = ref(false)
const error = ref('')
const { seoData } = useSeoMeta()
// The blocks ("Blog title", "Blog posts grid"…) read the list from here.
provide('blogList', data)

const sections = computed(() => blogSections(config.value, category.value))

// What the server (or the router's preFetch) already loaded for this address.
function adopt(blog) {
  if (!blog || blog.key !== keyOf(category.value, page.value)) return false
  data.value = blog.data
  config.value = blog.config
  notFound.value = !!blog.missing
  return !!blog.data || !!blog.missing
}
if (process.env.SERVER) adopt(useSSRContext()?.blogData)
if (process.env.CLIENT) adopt(window.__BLOG_DATA__)

async function load() {
  error.value = ''
  const { blog, seo } = await loadBlogList(route)
  if (blog.key !== keyOf(category.value, page.value)) return // the visitor moved on
  data.value = blog.data
  config.value = blog.config || config.value
  notFound.value = blog.missing
  seoData.value = seo
  if (!blog.data && !blog.missing) error.value = 'The blog could not be loaded. Try again in a moment.'
}

let unsubscribe = () => {}
onMounted(() => {
  if (!data.value && !notFound.value) load()
  // Live preview: the owner's draft template.
  unsubscribe = subscribeToLiveConfig('blog', (c) => (config.value = c))
})
onUnmounted(() => unsubscribe())

// Between categories and pages the component stays: load the new list.
watch(() => keyOf(category.value, page.value), (now, before) => {
  if (now === before) return
  if (process.env.CLIENT && adopt(window.__BLOG_DATA__)) {
    seoData.value = window.__SEO_DATA__
    return
  }
  load()
})
</script>

<style scoped>
.blog-page { padding-bottom: 40px; }
</style>
