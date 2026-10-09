<template>
  <component :is="tag" v-if="post" class="post-title" :style="{ textAlign: align }">{{ post.title }}</component>
</template>

<script setup>
import { computed, inject } from 'vue'

/** "Post Title" (blog post template): the post's title. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const post = inject('blogPost', null)
const d = computed(() => props.data.data || {})
const tag = computed(() => (d.value.tag === 'h2' ? 'h2' : 'h1'))
const align = computed(() => (['left', 'center', 'right'].includes(d.value.align) ? d.value.align : 'left'))
</script>

<style scoped>
.post-title { font-size: clamp(2rem, 5vw, 2.8rem); line-height: 1.15; margin: 0; font-weight: 600; overflow-wrap: anywhere; }
h2.post-title { font-size: clamp(1.6rem, 4vw, 2.2rem); }
</style>
