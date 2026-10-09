<template>
  <ErrorNotFound v-if="notFound" />
  <div v-else-if="!post" class="q-pa-xl flex justify-center">
    <q-spinner v-if="!error" color="secondary" size="3em" />
    <p v-else class="text-negative">{{ error }}</p>
  </div>
  <article v-else class="blog-post">
    <router-link to="/blog" class="blog-back">← Blog</router-link>
    <header class="blog-post-head">
      <p class="blog-post-meta text-caption">
        <time :datetime="new Date(post.date * 1000).toISOString()">{{ postDate(post.date, post.day) }}</time>
        <template v-for="c in post.categories" :key="c.slug"> · <router-link :to="`/blog/category/${c.slug}`">{{ c.name }}</router-link></template>
      </p>
      <h1 class="blog-post-title">{{ post.title }}</h1>
    </header>
    <img
      v-if="post.image"
      class="blog-post-cover"
      :src="post.image.url"
      :alt="post.image.alt || ''"
      :width="post.image.width || undefined"
      :height="post.image.height || undefined"
      fetchpriority="high"
    >
    <!-- eslint-disable-next-line vue/no-v-html -- sanitized (sanitizeBlogHtml) -->
    <div class="blog-post-content" v-html="content" />

    <section v-if="post.more?.length" class="blog-more" aria-labelledby="blog-more-title">
      <h2 id="blog-more-title">More to read</h2>
      <div class="blog-more-grid">
        <BlogCard v-for="p in post.more" :key="p.id" :post="p" :show-excerpt="false" />
      </div>
    </section>
  </article>
</template>

<script>
import { fetchBlogPost } from 'src/api/blog.js'
import { fetchSeoForPath } from 'src/composables/useSeo.js'
import { getApiOrigin } from 'src/utils/server/get-api-origin.js'

const keyOf = (slug) => `post|${slug}`

export async function loadBlogPost(slug, origin = '') {
  const [post, seo] = await Promise.all([
    fetchBlogPost(slug, origin).catch(() => undefined),
    fetchSeoForPath(`blog/${slug}`, origin),
  ])
  return { blog: { key: keyOf(slug), post: post ?? null, missing: post === null }, seo }
}
</script>

<script setup>
import { computed, onMounted, ref, useSSRContext, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BlogCard from 'components/blog/BlogCard.vue'
import ErrorNotFound from 'pages/ErrorNotFound.vue'
import { postDate } from 'src/api/blog.js'
import { sanitizeBlogHtml } from 'src/utils/sanitizeHtml.js'
import { useSeoMeta } from 'src/composables/useSeo.js'

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
const notFound = ref(false)
const error = ref('')
const { seoData } = useSeoMeta()
const content = computed(() => sanitizeBlogHtml(post.value?.content || ''))

function adopt(blog) {
  if (!blog || blog.key !== keyOf(slug.value)) return false
  post.value = blog.post
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
  notFound.value = blog.missing
  seoData.value = seo
  if (!blog.post && !blog.missing) error.value = 'The post could not be loaded. Try again in a moment.'
}

onMounted(() => {
  if (!post.value && !notFound.value) load()
})
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
.blog-post { max-width: 760px; margin: 0 auto; padding: 24px 16px 56px; }
.blog-back { display: inline-block; margin: 0 0 16px; color: inherit; text-decoration: none; opacity: .75; }
.blog-back:hover { opacity: 1; text-decoration: underline; }
.blog-post-meta { margin: 0 0 6px; opacity: .75; }
.blog-post-meta a { color: inherit; }
.blog-post-title { font-size: clamp(2rem, 5vw, 2.8rem); line-height: 1.15; margin: 0 0 20px; font-weight: 600; overflow-wrap: anywhere; }
.blog-post-cover { display: block; width: 100%; height: auto; border-radius: 14px; margin: 0 0 24px; }
.blog-post-content { font-size: 1.08rem; line-height: 1.75; overflow-wrap: anywhere; }
.blog-post-content :deep(h2) { font-size: 1.6rem; line-height: 1.3; margin: 1.6em 0 .5em; }
.blog-post-content :deep(h3) { font-size: 1.3rem; margin: 1.4em 0 .4em; }
.blog-post-content :deep(h4) { font-size: 1.1rem; margin: 1.2em 0 .4em; }
.blog-post-content :deep(p) { margin: 0 0 1em; }
.blog-post-content :deep(img) { display: block; max-width: 100%; height: auto; border-radius: 10px; margin: 1.2em auto; }
.blog-post-content :deep(blockquote) { margin: 1.2em 0; padding: .2em 0 .2em 1em; border-left: 3px solid currentColor; opacity: .85; font-style: italic; }
.blog-post-content :deep(a) { color: inherit; text-decoration: underline; }
.blog-post-content :deep(hr) { border: 0; border-top: 1px solid rgba(0, 0, 0, .15); margin: 2em 0; }
.blog-more { margin: 56px 0 0; padding: 32px 0 0; border-top: 1px solid rgba(0, 0, 0, .1); }
.blog-more h2 { font-size: 1.4rem; margin: 0 0 20px; }
.blog-more-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
@media (max-width: 767px) { .blog-more-grid { grid-template-columns: 1fr; } }
</style>
