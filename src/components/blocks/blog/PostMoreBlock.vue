<template>
  <section v-if="items.length" class="post-more" :aria-label="d.title || 'More to read'">
    <h2 v-if="d.title">{{ d.title }}</h2>
    <div class="post-more-grid">
      <BlogCard v-for="p in items" :key="p.id" :post="p" :show-excerpt="false" />
    </div>
  </section>
</template>

<script setup>
import { computed, inject } from 'vue'
import BlogCard from 'components/blog/BlogCard.vue'

/** "More Posts To Read" (blog post template): other posts, same category first. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' } })
const post = inject('blogPost', null)
const d = computed(() => props.data.data || {})
const items = computed(() => (post.value?.more || []).slice(0, Math.max(1, Math.min(3, Number(d.value.count) || 3))))
</script>

<style scoped>
.post-more { padding: 24px 0 0; border-top: 1px solid rgba(0, 0, 0, .1); }
.post-more h2 { font-size: 1.4rem; margin: 0 0 20px; }
.post-more-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
@media (max-width: 767px) { .post-more-grid { grid-template-columns: 1fr; } }
</style>
