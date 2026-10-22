<template>
  <ErrorNotFound v-if="notFound" />
  <div v-else-if="!data && !error" class="q-pa-xl flex justify-center"><q-spinner color="secondary" size="3em" /></div>
  <div v-else class="blog-page">
    <p v-if="error" class="text-negative q-pa-md">{{ error }}</p>
    <SectionRenderer v-else :sections="sections" page="blog_authors" />
  </div>
</template>

<script>
import { fetchAuthors } from 'src/api/blog.js'
import { fetchSeoForPath } from 'src/composables/useSeo.js'
import { getApiOrigin } from 'src/utils/server/get-api-origin.js'
import { loadPageConfig } from 'src/utils/config-loader.js'
import { DEFAULT_BLOG_AUTHORS_SECTIONS, localizeDefaults } from 'src/utils/blog-templates.js'
import { t as translate } from 'src/i18n/index.js'

const KEY = 'authors'

/** The template's sections, else the built-in ones. */
export function authorsSections(config) {
  return config && (config.sections || []).length ? config.sections : localizeDefaults(DEFAULT_BLOG_AUTHORS_SECTIONS, translate)
}

/** The authors (null: author profiles are off, so the page doesn't exist), the search listing and the template. */
export async function loadAuthors(origin = '') {
  const [data, seo, config] = await Promise.all([
    fetchAuthors(origin).catch(() => undefined),
    fetchSeoForPath('blog/authors', origin),
    loadPageConfig('blog_authors', false, origin).catch(() => null),
  ])
  return { blog: { key: KEY, data: data ?? null, missing: data === null, config: config || null }, seo }
}
</script>

<script setup>
import { computed, onMounted, onUnmounted, provide, ref, useSSRContext } from 'vue'
import ErrorNotFound from 'pages/ErrorNotFound.vue'
import SectionRenderer from 'components/sections/SectionRenderer.vue'
import { useSeoMeta } from 'src/composables/useSeo.js'
import { subscribeToLiveConfig } from 'src/utils/config-loader.js'
import { useI18n } from 'src/i18n/index.js'

/** /blog/authors: every author with posts (Store builder → Blog → Authors page). */
const { t } = useI18n()

defineOptions({
  async preFetch({ ssrContext }) {
    const { blog, seo } = await loadAuthors(getApiOrigin(ssrContext))
    if (ssrContext) {
      ssrContext.blogData = blog
      ssrContext.seoData = blog.missing ? { ...seo, robots: 'noindex, nofollow', not_found: true } : seo
    } else {
      window.__BLOG_DATA__ = blog
      window.__SEO_DATA__ = seo
    }
  },
})

const data = ref(null)
const config = ref(null)
const notFound = ref(false)
const error = ref('')
const { seoData } = useSeoMeta()
// The "Authors Grid" block reads the list from here.
provide('blogAuthors', data)

const sections = computed(() => authorsSections(config.value))

function adopt(blog) {
  if (!blog || blog.key !== KEY) return false
  data.value = blog.data
  config.value = blog.config
  notFound.value = !!blog.missing
  return !!blog.data || !!blog.missing
}
if (process.env.SERVER) adopt(useSSRContext()?.blogData)
if (process.env.CLIENT) adopt(window.__BLOG_DATA__)

async function load() {
  error.value = ''
  const { blog, seo } = await loadAuthors()
  data.value = blog.data
  config.value = blog.config || config.value
  notFound.value = !!blog.missing
  seoData.value = seo
  if (!blog.data && !blog.missing) error.value = t('The authors could not be loaded. Try again in a moment.')
}

let unsubscribe = () => {}
onMounted(() => {
  if (!data.value && !notFound.value) load()
  // Live preview: the owner's draft template.
  unsubscribe = subscribeToLiveConfig('blog_authors', (c) => (config.value = c))
})
onUnmounted(() => unsubscribe())
</script>

<style scoped>
.blog-page { padding-bottom: 40px; }
</style>
