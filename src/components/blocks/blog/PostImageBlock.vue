<template>
  <img
    v-if="post?.image"
    class="post-image"
    :class="{ rounded: d.rounded !== false }"
    :style="ratio ? { aspectRatio: ratio, objectFit: 'cover' } : null"
    :src="post.image.url"
    :alt="post.image.alt || ''"
    :width="post.image.width || undefined"
    :height="post.image.height || undefined"
    fetchpriority="high"
  >
</template>

<script setup>
import { computed, inject } from 'vue'

/** "Post Cover Image" (blog post template): shown only where the owner places it. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const post = inject('blogPost', null)
const d = computed(() => props.data.data || {})
const ratio = computed(() => (['16/9', '4/3', '1/1'].includes(d.value.ratio) ? d.value.ratio.replace('/', ' / ') : ''))
</script>

<style scoped>
.post-image { display: block; width: 100%; height: auto; }
.post-image.rounded { border-radius: 14px; }
</style>
