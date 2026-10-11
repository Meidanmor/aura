<template>
  <component :is="tag" v-if="post" class="post-title" :class="titleText.class" :style="[{ textAlign: align }, titleText.style]">{{ post.title }}</component>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

/** "Post Title" (blog post template): the post's title. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const post = inject('blogPost', null)
const d = computed(() => props.data.data || {})
const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))
const tag = computed(() => (d.value.tag === 'h2' ? 'h2' : 'h1'))
// "default" (and older data without a value): the start of the line in the page's language.
const align = computed(() => (['left', 'center', 'right'].includes(d.value.align) ? d.value.align : 'start'))
</script>

<style scoped>
.post-title { font-size: clamp(2rem, 5vw, 2.8rem); line-height: 1.15; margin: 0; font-weight: 600; overflow-wrap: anywhere; }
h2.post-title { font-size: clamp(1.6rem, 4vw, 2.2rem); }
</style>
