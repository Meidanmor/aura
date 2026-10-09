<template>
  <p v-if="post && (showDate || cats.length)" class="post-meta text-caption" :style="{ textAlign: align }">
    <time v-if="showDate" :datetime="new Date(post.date * 1000).toISOString()">{{ postDate(post.date, post.day) }}</time>
    <template v-for="(c, i) in cats" :key="c.slug">
      <span v-if="showDate || i > 0"> · </span><router-link :to="`/blog/category/${c.slug}`">{{ c.name }}</router-link>
    </template>
  </p>
</template>

<script setup>
import { computed, inject } from 'vue'
import { postDate } from 'src/api/blog.js'

/** "Post Date & Categories" (blog post template). */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' } })
const post = inject('blogPost', null)
const d = computed(() => props.data.data || {})
const showDate = computed(() => d.value.show_date !== false)
const cats = computed(() => (d.value.show_categories !== false ? post.value?.categories || [] : []))
const align = computed(() => (['left', 'center', 'right'].includes(d.value.align) ? d.value.align : 'left'))
</script>

<style scoped>
.post-meta { margin: 0; opacity: .75; }
.post-meta a { color: inherit; }
</style>
