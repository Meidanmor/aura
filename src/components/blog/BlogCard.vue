<template>
  <article class="blog-card">
    <router-link :to="`/blog/${post.slug}`" class="blog-card-link">
      <div v-if="post.image" class="blog-card-image">
        <img :src="post.image.url" :alt="post.image.alt || ''" :width="post.image.width || undefined" :height="post.image.height || undefined" loading="lazy" decoding="async">
      </div>
      <div class="blog-card-body">
        <p v-if="showDate || post.categories?.length" class="blog-card-meta text-caption">
          <span v-if="showDate">{{ postDate(post.date, post.day) }}</span>
          <span v-if="showDate && post.categories?.length"> · </span>
          <span v-if="post.categories?.length">{{ post.categories.map((c) => c.name).join(', ') }}</span>
        </p>
        <h3 class="blog-card-title">{{ post.title }}</h3>
        <p v-if="showExcerpt && post.excerpt" class="blog-card-excerpt">{{ post.excerpt }}</p>
      </div>
    </router-link>
  </article>
</template>

<script setup>
import { postDate } from 'src/api/blog.js'

/** A post in a list: cover, date, categories, title and summary. */
defineProps({
  post: { type: Object, required: true },
  showExcerpt: { type: Boolean, default: true },
  showDate: { type: Boolean, default: true },
})
</script>

<style scoped>
.blog-card { min-width: 0; }
.blog-card-link { display: flex; flex-direction: column; height: 100%; color: inherit; text-decoration: none; }
.blog-card-image { aspect-ratio: 16 / 10; overflow: hidden; border-radius: 12px; background: rgba(0, 0, 0, .05); }
.blog-card-image img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; }
.blog-card-link:hover .blog-card-image img { transform: scale(1.03); }
.blog-card-body { padding: 12px 2px 0; }
.blog-card-meta { margin: 0 0 4px; opacity: .7; }
.blog-card-title { font-size: 1.15rem; line-height: 1.35; margin: 0 0 6px; font-weight: 600; overflow-wrap: anywhere; }
.blog-card-link:hover .blog-card-title { text-decoration: underline; }
.blog-card-excerpt { margin: 0; opacity: .85; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
@media (prefers-reduced-motion: reduce) { .blog-card-image img { transition: none; } }
</style>
