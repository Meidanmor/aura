<template>
  <!-- eslint-disable-next-line vue/no-v-html -- sanitized (sanitizeBlogHtml) -->
  <div v-if="post" class="post-content" v-html="html" />
</template>

<script setup>
import { computed, inject } from 'vue'
import { sanitizeBlogHtml } from 'src/utils/sanitizeHtml.js'

/** "Post Content" (blog post template): the post's text. */
defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' } })
const post = inject('blogPost', null)
const html = computed(() => sanitizeBlogHtml(post.value?.content || ''))
</script>

<style scoped>
.post-content { font-size: 1.08rem; line-height: 1.75; overflow-wrap: anywhere; }
.post-content :deep(h2) { font-size: 1.6rem; line-height: 1.3; margin: 1.6em 0 .5em; }
.post-content :deep(h3) { font-size: 1.3rem; margin: 1.4em 0 .4em; }
.post-content :deep(h4) { font-size: 1.1rem; margin: 1.2em 0 .4em; }
.post-content :deep(p) { margin: 0 0 1em; }
.post-content :deep(img) { display: block; max-width: 100%; height: auto; border-radius: 10px; margin: 1.2em auto; }
.post-content :deep(blockquote) { margin: 1.2em 0; padding: .2em 0 .2em 1em; border-left: 3px solid currentColor; opacity: .85; font-style: italic; }
.post-content :deep(a) { color: inherit; text-decoration: underline; }
.post-content :deep(hr) { border: 0; border-top: 1px solid rgba(0, 0, 0, .15); margin: 2em 0; }
</style>
