<template>
  <ErrorNotFound v-if="notFound" />
  <div v-else-if="!post" class="q-pa-xl flex justify-center">
    <q-spinner v-if="!error" color="secondary" size="3em" />
    <p v-else class="text-negative">{{ error }}</p>
  </div>
  <article v-else class="blog-post">
    <SectionRenderer :sections="sections" page="blog_post" />
  </article>
</template>

<script>
import { fetchBlogPost } from 'src/api/blog.js'
import { fetchSeoForPath } from 'src/composables/useSeo.js'
import { getApiOrigin } from 'src/utils/server/get-api-origin.js'
import { loadPageConfig } from 'src/utils/config-loader.js'

const keyOf = (slug) => `post|${slug}`

/** The post, its search listing and the Store builder's post template. */
export async function loadBlogPost(slug, origin = '') {
  const [post, seo, config] = await Promise.all([
    fetchBlogPost(slug, origin).catch(() => undefined),
    fetchSeoForPath(`blog/${slug}`, origin),
    loadPageConfig('blog_post', false, origin).catch(() => null),
  ])
  return { blog: { key: keyOf(slug), post: post ?? null, missing: post === null, config: config || null }, seo }
}
</script>

<script setup>
import { computed, onMounted, onUnmounted, provide, ref, useSSRContext, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ErrorNotFound from 'pages/ErrorNotFound.vue'
import SectionRenderer from 'components/sections/SectionRenderer.vue'
import { useSeoMeta } from 'src/composables/useSeo.js'
import { subscribeToLiveConfig } from 'src/utils/config-loader.js'
import { pickSections, postMatch } from 'src/utils/layouts.js'
import { DEFAULT_BLOG_POST_SECTIONS, localizeDefaults } from 'src/utils/blog-templates.js'
import { useI18n } from 'src/i18n/index.js'

const { t } = useI18n()

defineOptions({
  async preFetch({ ssrContext, currentRoute, redirect }) {
    const { blog, seo } = await loadBlogPost(String(currentRoute.params.slug || ''), getApiOrigin(ssrContext))
    // The owner renamed the post: send visitors and search engines to its new address.
    if (blog.missing && seo.redirect) {
      redirect(seo.redirect, 301)
      return
    }
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
const router = useRouter()
const slug = computed(() => String(route.params.slug || ''))
const post = ref(null)
const config = ref(null)
const notFound = ref(false)
const error = ref('')
const { seoData } = useSeoMeta()
// The blocks ("Post title", "Post content"…) read the post from here.
provide('blogPost', post)

// The post template (Store builder → Blog → Blog post): a layout for the post's category,
// else the default; the built-in one until the owner publishes theirs.
const sections = computed(() => {
  const c = config.value
  const own = c && ((c.sections || []).length || (c.layouts || []).length || c.preview_layout !== undefined)
  return own ? pickSections(c, postMatch(post.value)) : localizeDefaults(DEFAULT_BLOG_POST_SECTIONS, t)
})

function adopt(blog) {
  if (!blog || blog.key !== keyOf(slug.value)) return false
  post.value = blog.post
  config.value = blog.config
  notFound.value = !!blog.missing
  return !!blog.post || !!blog.missing
}
if (process.env.SERVER) adopt(useSSRContext()?.blogData)
if (process.env.CLIENT) adopt(window.__BLOG_DATA__)

async function load() {
  error.value = ''
  const { blog, seo } = await loadBlogPost(slug.value)
  if (blog.key !== keyOf(slug.value)) return
  if (blog.missing && seo.redirect) return router.replace(seo.redirect)
  post.value = blog.post
  config.value = blog.config || config.value
  notFound.value = blog.missing
  seoData.value = seo
  if (!blog.post && !blog.missing) error.value = t('The post could not be loaded. Try again in a moment.')
}

let unsubscribe = () => {}
onMounted(() => {
  if (!post.value && !notFound.value) load()
  // Live preview: the owner's draft template.
  unsubscribe = subscribeToLiveConfig('blog_post', (data) => (config.value = data))
})
onUnmounted(() => unsubscribe())

// From one post to another ("More to read"): the component stays.
watch(slug, (now, before) => {
  if (!now || now === before) return
  post.value = null
  notFound.value = false
  if (process.env.CLIENT && adopt(window.__BLOG_DATA__)) {
    seoData.value = window.__SEO_DATA__
    return
  }
  load()
})
</script>

<style scoped>
.blog-post { padding-bottom: 40px; }
</style>
