<template>
  <div class="a11y-statement">
    <div v-if="!data && !error" class="q-pa-xl flex justify-center"><q-spinner color="secondary" size="3em" /></div>
    <p v-else-if="error" class="text-negative">{{ error }}</p>
    <article v-else>
      <h1>{{ data.title }}</h1>
      <!-- Written by the store (Qwoo_Accessibility::statement): every value is escaped there. -->
      <div class="a11y-statement__text" v-html="data.html" />
    </article>
  </div>
</template>

<script>
import { fetchSeoForPath } from 'src/composables/useSeo.js'
import { getApiOrigin } from 'src/utils/server/get-api-origin.js'
import { currentLang } from 'src/i18n/lang.js'

const KEY = 'a11y-statement'

/** The store's accessibility statement (dashboard: Settings → Accessibility), written live from its details. */
export async function loadStatement(origin = '') {
  const lang = currentLang()
  const [data, seo] = await Promise.all([
    fetch(`${origin}/wp-json/qwoo/v1/site/a11y-statement?lang=${encodeURIComponent(lang || '')}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetchSeoForPath('accessibility-statement', origin).catch(() => null),
  ])
  const title = data?.title || ''
  return { blog: { key: KEY, data }, seo: { ...(seo || {}), ...(title ? { title: seo?.site_name ? `${title} | ${seo.site_name}` : title } : {}) } }
}
</script>

<script setup>
import { onMounted, ref, useSSRContext } from 'vue'
import { useSeoMeta } from 'src/composables/useSeo.js'
import { useI18n } from 'src/i18n/index.js'

const { t } = useI18n()

defineOptions({
  async preFetch({ ssrContext }) {
    const { blog, seo } = await loadStatement(getApiOrigin(ssrContext))
    if (ssrContext) {
      ssrContext.blogData = blog
      ssrContext.seoData = seo
    } else {
      window.__BLOG_DATA__ = blog
      window.__SEO_DATA__ = seo
    }
  },
})

const data = ref(null)
const error = ref('')
const { seoData } = useSeoMeta({ title: t('Accessibility statement') })

function adopt(blog) {
  if (!blog || blog.key !== KEY || !blog.data) return false
  data.value = blog.data
  return true
}
if (process.env.SERVER) adopt(useSSRContext()?.blogData)
if (process.env.CLIENT) adopt(window.__BLOG_DATA__)

onMounted(async () => {
  if (data.value) return
  const { blog, seo } = await loadStatement()
  if (!adopt(blog)) error.value = t('The accessibility statement could not be loaded. Try again in a moment.')
  seoData.value = seo
})
</script>

<style scoped>
.a11y-statement { max-width: 760px; margin: 0 auto; padding: 32px 16px 64px; }
.a11y-statement h1 { font-size: 34px; line-height: 1.2; margin: 0 0 8px; }
.a11y-statement__text :deep(h2) { font-size: 22px; line-height: 1.3; margin: 28px 0 8px; }
.a11y-statement__text :deep(p), .a11y-statement__text :deep(li) { font-size: 17px; line-height: 1.6; }
.a11y-statement__text :deep(ul) { padding-inline-start: 22px; margin: 0; }
.a11y-statement__text :deep(li + li) { margin-top: 6px; }
.a11y-statement__text :deep(a) { text-decoration: underline; }
</style>
