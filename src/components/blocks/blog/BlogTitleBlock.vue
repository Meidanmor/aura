<template>
  <header class="blog-title" :class="`is-${align}`">
    <h1>{{ list?.category ? list.category.name : (d.title || t('Blog')) }}</h1>
    <p v-if="d.show_description !== false && list?.category?.description" class="blog-title-intro">{{ list.category.description }}</p>
  </header>
</template>

<script setup>
import { computed, inject } from 'vue'

/** "Blog Title" (blog page template): "Blog" on /blog, the category's name on its page. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const list = inject('blogList', null)
const d = computed(() => props.data.data || {})
const align = computed(() => (['left', 'center', 'right'].includes(d.value.align) ? d.value.align : 'left'))
</script>

<style scoped>
.blog-title.is-center { text-align: center; }
.blog-title.is-right { text-align: right; }
.blog-title h1 { font-size: clamp(2rem, 4vw, 2.75rem); line-height: 1.15; margin: 0; font-weight: 600; }
.blog-title-intro { margin: 8px 0 0; max-width: 65ch; opacity: .85; }
.blog-title.is-center .blog-title-intro { margin-inline: auto; }
.blog-title.is-right .blog-title-intro { margin-left: auto; }
</style>
