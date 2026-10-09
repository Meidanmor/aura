<template>
  <ErrorNotFound v-if="notFound" />
  <div v-else class="blog-page">
    <header class="blog-head">
      <h1 class="blog-h1">{{ data?.category ? data.category.name : 'Blog' }}</h1>
      <p v-if="data?.category?.description" class="blog-intro">{{ data.category.description }}</p>
    </header>

    <nav v-if="data?.categories?.length" class="blog-cats" aria-label="Blog categories">
      <router-link to="/blog" class="blog-cat" :class="{ on: !category }" :aria-current="!category ? 'page' : undefined">All</router-link>
      <router-link
        v-for="c in data.categories"
        :key="c.slug"
        :to="`/blog/category/${c.slug}`"
        class="blog-cat"
        :class="{ on: c.slug === category }"
        :aria-current="c.slug === category ? 'page' : undefined"
      >{{ c.name }}</router-link>
    </nav>

    <div v-if="!data && loading" class="q-pa-xl flex justify-center"><q-spinner color="secondary" size="3em" /></div>
    <p v-else-if="error" class="text-negative">{{ error }}</p>
    <p v-else-if="data && !data.posts.length" class="blog-empty">No posts yet. Check back soon.</p>
    <div v-else-if="data" class="blog-grid">
      <BlogCard v-for="p in data.posts" :key="p.id" :post="p" />
    </div>

    <nav v-if="data?.pages > 1" class="blog-pager" aria-label="Pages">
      <router-link v-if="page > 1" :to="pageLink(page - 1)">← Newer posts</router-link>
      <span>Page {{ page }} of {{ data.pages }}</span>
      <router-link v-if="page < data.pages" :to="pageLink(page + 1)">Older posts →</router-link>
    </nav>
  </div>
</template>

<script>
import { fetchBlogList } from 'src/api/blog.js'
import { fetchSeoForPath } from 'src/composables/useSeo.js'
import { getApiOrigin } from 'src/utils/server/get-api-origin.js'

const keyOf = (category, page) => `list|${category}|${page}`
const pathOf = (category) => (category ? `blog/category/${category}` : 'blog')

export async function loadBlogList(route, origin = '') {
  const category = String(route.params.category || '')
  const page = Math.max(1, Number(route.query.page) || 1)
  const [data, seo] = await Promise.all([
    fetchBlogList({ page, category }, origin).catch(() => undefined),
    fetchSeoForPath(pathOf(category), origin),
  ])
  // null: the category doesn't exist (404); undefined: the store didn't answer.
  return { blog: { key: keyOf(category, page), data: data ?? null, missing: data === null }, seo }
}
</script>

<script setup>
import { computed, onMounted, ref, useSSRContext, watch } from 'vue'
import { useRoute } from 'vue-router'
import BlogCard from 'components/blog/BlogCard.vue'
import ErrorNotFound from 'pages/ErrorNotFound.vue'
import { useSeoMeta } from 'src/composables/useSeo.js'

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
const notFound = ref(false)
const loading = ref(false)
const error = ref('')
const { seoData } = useSeoMeta()

// What the server (or the router's preFetch) already loaded for this address.
function adopt(blog) {
  if (!blog || blog.key !== keyOf(category.value, page.value)) return false
  data.value = blog.data
  notFound.value = !!blog.missing
  return !!blog.data || !!blog.missing
}
if (process.env.SERVER) adopt(useSSRContext()?.blogData)
if (process.env.CLIENT) adopt(window.__BLOG_DATA__)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { blog, seo } = await loadBlogList(route)
    if (blog.key !== keyOf(category.value, page.value)) return // the visitor moved on
    data.value = blog.data
    notFound.value = blog.missing
    seoData.value = seo
    if (!blog.data && !blog.missing) error.value = 'The blog could not be loaded. Try again in a moment.'
  } finally {
    loading.value = false
  }
}

const pageLink = (n) => ({ path: route.path, query: n > 1 ? { page: n } : {} })

onMounted(() => {
  if (!data.value && !notFound.value) load()
})
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
.blog-page { max-width: 1200px; margin: 0 auto; padding: 24px 16px 48px; }
.blog-head { margin: 0 0 16px; }
.blog-h1 { font-size: clamp(2rem, 4vw, 2.75rem); line-height: 1.15; margin: 0; font-weight: 600; }
.blog-intro { margin: 8px 0 0; max-width: 65ch; opacity: .85; }
.blog-cats { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 24px; }
.blog-cat { padding: 6px 14px; border-radius: 99px; border: 1px solid rgba(0, 0, 0, .15); color: inherit; text-decoration: none; font-size: 14px; }
.blog-cat.on, .blog-cat:hover { border-color: currentColor; font-weight: 600; }
.blog-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px 24px; }
.blog-empty { padding: 24px 0; }
.blog-pager { display: flex; align-items: center; justify-content: center; gap: 24px; margin: 40px 0 0; }
.blog-pager a { color: inherit; font-weight: 600; }
@media (max-width: 1023px) { .blog-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 599px) { .blog-grid { grid-template-columns: 1fr; } }
</style>
