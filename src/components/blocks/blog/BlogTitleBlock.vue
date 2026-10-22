<template>
  <header class="blog-title" :class="`is-${align}`" :style="{ textAlign: align }">
    <h1 v-bind="titleText">{{ list?.author ? list.author.name : list?.category ? list.category.name : (d.title || t('Blog')) }}</h1>
    <p v-if="d.show_description !== false && list?.category?.description" class="blog-title-intro" v-bind="descText">{{ list.category.description }}</p>
  </header>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

/** "Blog Title" (blog page template): "Blog" on /blog, the category's (or author's) name on its page. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const list = inject('blogList', null)
const d = computed(() => props.data.data || {})
const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))
const descText = computed(() => textStyle(d.value, tsKeys('desc')))
// "default" (and older data without a value): the start of the line in the page's language.
const align = computed(() => (['left', 'center', 'right'].includes(d.value.align) ? d.value.align : 'start'))
</script>

<style scoped>
.blog-title h1 { font-size: clamp(2rem, 4vw, 2.75rem); line-height: 1.15; margin: 0; font-weight: 600; }
.blog-title-intro { margin: 8px 0 0; max-width: 65ch; opacity: .85; }
.blog-title.is-center .blog-title-intro { margin-inline: auto; }
/* Physical sides (inline text-align above isn't flipped either). */
/* rtl:begin:ignore */
.blog-title.is-right .blog-title-intro { margin-left: auto; }
.blog-title.is-left .blog-title-intro { margin-right: auto; }
/* rtl:end:ignore */
</style>
