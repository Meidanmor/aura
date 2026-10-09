<template>
  <div v-if="posts?.length" class="latest-posts" :style="cssVars">
    <div class="latest-posts-grid">
      <BlogCard v-for="p in posts" :key="p.id" :post="p" :show-excerpt="opts.show_excerpt !== false" :show-date="opts.show_date !== false" />
    </div>
    <div v-if="opts.button_label" class="latest-posts-more">
      <q-btn outline color="secondary" :label="opts.button_label" to="/blog" no-caps />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onServerPrefetch, useSSRContext, watch } from 'vue'
import BlogCard from 'components/blog/BlogCard.vue'
import { fetchBlogList } from 'src/api/blog.js'
import { getApiOrigin } from 'src/utils/server/get-api-origin.js'
import { useSectionData } from 'src/composables/useSectionData.js'

/** "Latest Blog Posts" (Store builder): the newest posts, linking to /blog. Hidden while there are none. */
const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, required: true },
})

const opts = computed(() => props.data.data || {})
const count = () => Math.max(1, Math.min(12, Number(opts.value.count) || 3))

const { data: posts, resolve } = useSectionData(props.blockId, async (ssrContext) => {
  const list = await fetchBlogList({ perPage: count() }, ssrContext ? getApiOrigin(ssrContext) : '').catch(() => null)
  return list?.posts || []
})

// Posts per row, by screen size.
const cssVars = computed(() => {
  const c = opts.value.columns || {}
  const n = (v, d) => Math.max(1, Math.min(4, Number(v) || d))
  return { '--lp-desktop': n(c.desktop, 3), '--lp-tablet': n(c.tablet ?? c.desktop, 2), '--lp-mobile': n(c.mobile, 1) }
})

let ssrContext = null
if (process.env.SERVER) ssrContext = useSSRContext()
onServerPrefetch(() => resolve(ssrContext))
onMounted(() => {
  if (posts.value === null) resolve(null)
})
// Live preview: a different number of posts.
watch(() => opts.value.count, (now, before) => {
  if (now !== before) resolve(null)
})
</script>

<style scoped>
.latest-posts-grid { display: grid; grid-template-columns: repeat(var(--lp-desktop), minmax(0, 1fr)); gap: 32px 24px; }
.latest-posts-more { display: flex; justify-content: center; margin: 28px 0 0; }
@media (max-width: 1023px) { .latest-posts-grid { grid-template-columns: repeat(var(--lp-tablet), minmax(0, 1fr)); } }
@media (max-width: 599px) { .latest-posts-grid { grid-template-columns: repeat(var(--lp-mobile), minmax(0, 1fr)); } }
</style>
