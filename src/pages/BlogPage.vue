<template>
  <ErrorNotFound v-if="notFound" />
  <div v-else-if="!data && !error" class="q-pa-xl flex justify-center"><q-spinner color="secondary" size="3em" /></div>
  <div v-else class="blog-page">
    <p v-if="error" class="text-negative q-pa-md">{{ error }}</p>
    <SectionRenderer v-else :sections="sections" :page="configPage" />
  </div>
</template>

<script>
import { fetchBlogList } from 'src/api/blog.js'
import { fetchSeoForPath } from 'src/composables/useSeo.js'
import { getApiOrigin } from 'src/utils/server/get-api-origin.js'
import { isEditorMode, loadPageConfig } from 'src/utils/config-loader.js'
import { blogCategoryMatch, pickSections } from 'src/utils/layouts.js'
import { DEFAULT_BLOG_AUTHOR_SECTIONS, DEFAULT_BLOG_SECTIONS, localizeDefaults, postsPerPage } from 'src/utils/blog-templates.js'
import { t as translate } from 'src/i18n/index.js'

const keyOf = (category, page, author = '') => `list|${category}|${page}|${author}`
const pathOf = (category, author = '') => (author ? `blog/author/${author}` : category ? `blog/category/${category}` : 'blog')

/**
 * The template's sections for a category ('' = /blog): its layout, the default, or the
 * built-in one. An author's page (author) has its own template (blog_author), no layouts.
 */
export function blogSections(config, category, author = '') {
  const own = config && ((config.sections || []).length || (config.layouts || []).length || config.preview_layout !== undefined)
  if (author) return own ? config.sections || [] : localizeDefaults(DEFAULT_BLOG_AUTHOR_SECTIONS, translate)
  return own ? pickSections(config, blogCategoryMatch(category)) : localizeDefaults(DEFAULT_BLOG_SECTIONS, translate)
}

/** Not found: no such category, or a store with no posts at all (no blog), except in the Store builder's preview. */
const isMissing = (blog) => !!blog.missing && !(blog.empty && isEditorMode())

/** The posts (as many per page as the template's posts grid shows), the search listing and the template. */
export async function loadBlogList(route, origin = '') {
  const category = String(route.params.category || '')
  const author = String(route.params.author || '')
  const page = Math.max(1, Number(route.query.page) || 1)
  const config = await loadPageConfig(author ? 'blog_author' : 'blog', false, origin).catch(() => null)
  const [data, seo] = await Promise.all([
    fetchBlogList({ page, category, author, perPage: postsPerPage(blogSections(config, category, author)) }, origin).catch(() => undefined),
    fetchSeoForPath(pathOf(category, author), origin),
  ])
  // null: the category (or author, or author profiles) doesn't exist (404); undefined: the store didn't answer.
  // No published posts anywhere: the store has no blog (404 too).
  const empty = !!data && !category && !author && !Number(data.total)
  return { blog: { key: keyOf(category, page, author), data: data ?? null, missing: data === null || empty, empty, config: config || null }, seo }
}
</script>

<script setup>
import { computed, onMounted, onUnmounted, provide, ref, useSSRContext, watch } from 'vue'
import { useRoute } from 'vue-router'
import ErrorNotFound from 'pages/ErrorNotFound.vue'
import SectionRenderer from 'components/sections/SectionRenderer.vue'
import { useSeoMeta } from 'src/composables/useSeo.js'
import { subscribeToLiveConfig } from 'src/utils/config-loader.js'
import { useI18n } from 'src/i18n/index.js'

const { t } = useI18n()

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
const author = computed(() => String(route.params.author || ''))
const configPage = computed(() => (author.value ? 'blog_author' : 'blog'))
const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const data = ref(null)
const config = ref(null)
const notFound = ref(false)
const error = ref('')
const { seoData } = useSeoMeta()
// The blocks ("Blog title", "Blog posts grid"…) read the list from here.
provide('blogList', data)

const sections = computed(() => blogSections(config.value, category.value, author.value))
const currentKey = () => keyOf(category.value, page.value, author.value)

// What the server (or the router's preFetch) already loaded for this address.
function adopt(blog) {
  if (!blog || blog.key !== currentKey()) return false
  data.value = blog.data
  config.value = blog.config
  notFound.value = isMissing(blog)
  return !!blog.data || !!blog.missing
}
if (process.env.SERVER) adopt(useSSRContext()?.blogData)
if (process.env.CLIENT) adopt(window.__BLOG_DATA__)

async function load() {
  error.value = ''
  const { blog, seo } = await loadBlogList(route)
  if (blog.key !== currentKey()) return // the visitor moved on
  data.value = blog.data
  config.value = blog.config || config.value
  notFound.value = isMissing(blog)
  seoData.value = seo
  if (!blog.data && !blog.missing) error.value = t('The blog could not be loaded. Try again in a moment.')
}

let unsubscribe = () => {}
onMounted(() => {
  if (!data.value && !notFound.value) load()
  // Live preview: the owner's draft template.
  unsubscribe = subscribeToLiveConfig(configPage.value, (c) => (config.value = c))
})
onUnmounted(() => unsubscribe())

// Between categories, authors and pages the component stays: load the new list.
watch(currentKey, (now, before) => {
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
