<template>
  <div class="blog-posts" :style="cssVars">
    <p v-if="list && !list.posts?.length" class="blog-posts-empty">No posts yet. Check back soon.</p>
    <div v-else-if="list" class="blog-posts-grid">
      <BlogCard
        v-for="p in list.posts"
        :key="p.id"
        :post="d.show_image === false ? { ...p, image: null } : p"
        :show-excerpt="d.show_excerpt !== false"
        :show-date="d.show_date !== false"
      />
    </div>
    <nav v-if="list?.pages > 1" class="blog-posts-pager" aria-label="Pages">
      <router-link v-if="list.page > 1" :to="pageLink(list.page - 1)">← Newer posts</router-link>
      <span>Page {{ list.page }} of {{ list.pages }}</span>
      <router-link v-if="list.page < list.pages" :to="pageLink(list.page + 1)">Older posts →</router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useRoute } from 'vue-router'
import BlogCard from 'components/blog/BlogCard.vue'

/**
 * "Blog Posts Grid" (blog page template): the posts of /blog or a blog
 * category, with pages. How many per page is read by the page itself
 * (BlogPage.vue), which loads them.
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' } })
const list = inject('blogList', null)
const route = useRoute()
const d = computed(() => props.data.data || {})
const pageLink = (n) => ({ path: route.path, query: n > 1 ? { page: n } : {} })

const cssVars = computed(() => {
  const c = d.value.columns || {}
  const n = (v, def) => Math.max(1, Math.min(4, Number(v) || def))
  return { '--bp-desktop': n(c.desktop, 3), '--bp-tablet': n(c.tablet ?? c.desktop, 2), '--bp-mobile': n(c.mobile, 1) }
})
</script>

<style scoped>
.blog-posts-grid { display: grid; grid-template-columns: repeat(var(--bp-desktop), minmax(0, 1fr)); gap: 32px 24px; }
.blog-posts-empty { padding: 24px 0; }
.blog-posts-pager { display: flex; align-items: center; justify-content: center; gap: 24px; margin: 40px 0 0; }
.blog-posts-pager a { color: inherit; font-weight: 600; }
@media (max-width: 1023px) { .blog-posts-grid { grid-template-columns: repeat(var(--bp-tablet), minmax(0, 1fr)); } }
@media (max-width: 599px) { .blog-posts-grid { grid-template-columns: repeat(var(--bp-mobile), minmax(0, 1fr)); } }
</style>
