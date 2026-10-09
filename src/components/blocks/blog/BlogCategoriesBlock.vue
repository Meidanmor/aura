<template>
  <nav v-if="list?.categories?.length" class="blog-cats" aria-label="Blog categories">
    <router-link to="/blog" class="blog-cat" :class="{ on: !current }" :aria-current="!current ? 'page' : undefined">{{ d.all_label || 'All' }}</router-link>
    <router-link
      v-for="c in list.categories"
      :key="c.slug"
      :to="`/blog/category/${c.slug}`"
      class="blog-cat"
      :class="{ on: c.slug === current }"
      :aria-current="c.slug === current ? 'page' : undefined"
    >{{ c.name }}</router-link>
  </nav>
</template>

<script setup>
import { computed, inject } from 'vue'

/** "Blog Category Links" (blog page template). */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' } })
const list = inject('blogList', null)
const d = computed(() => props.data.data || {})
const current = computed(() => list.value?.category?.slug || '')
</script>

<style scoped>
.blog-cats { display: flex; flex-wrap: wrap; gap: 8px; }
.blog-cat { padding: 6px 14px; border-radius: 99px; border: 1px solid rgba(0, 0, 0, .15); color: inherit; text-decoration: none; font-size: 14px; }
.blog-cat.on, .blog-cat:hover { border-color: currentColor; font-weight: 600; }
</style>
