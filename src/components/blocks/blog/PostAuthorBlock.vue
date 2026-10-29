<template>
  <div v-if="author" class="post-author" :class="`is-${align}`" :style="vars">
    <component :is="href ? 'router-link' : 'span'" v-if="d.show_image !== false && author.image" :to="href || undefined" class="post-author-photo" tabindex="-1" aria-hidden="true">
      <img :src="author.image.url" :width="author.image.width" :height="author.image.height" alt="" loading="lazy">
    </component>
    <div class="post-author-text">
      <p class="post-author-name" :class="nameText.class" :style="nameText.style">
        <span v-if="prefix">{{ prefix }} </span>
        <router-link v-if="href" :to="href">{{ author.name }}</router-link>
        <span v-else>{{ author.name }}</span>
      </p>
      <p v-if="d.show_date && post" class="post-author-meta" :class="metaText.class" :style="metaText.style">
        <time :datetime="new Date(post.date * 1000).toISOString()">{{ postDate(post.date, post.day) }}</time>
      </p>
      <p v-if="d.show_bio && author.bio" class="post-author-meta post-author-bio" :class="metaText.class" :style="metaText.style">{{ author.bio }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { asResponsive } from 'src/composables/useSectionStyle.js'
import { postDate } from 'src/api/blog.js'
import { useI18n } from 'src/i18n/index.js'

/**
 * "Post Author" (blog post template): who wrote the post, with their photo,
 * and a link to their page while author profiles are on (author.url).
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const post = inject('blogPost', null)
const { t } = useI18n()
const d = computed(() => props.data.data || {})
const author = computed(() => post?.value?.author || null)
const href = computed(() => (d.value.link !== false && author.value?.url ? author.value.url : ''))
const prefix = computed(() => (d.value.prefix === undefined || d.value.prefix === '' ? t('Written by') : d.value.prefix))
const nameText = computed(() => textStyle(d.value, tsKeys('name')))
const metaText = computed(() => textStyle(d.value, tsKeys('meta')))
// "default" (and older data without a value): the start of the line in the page's language.
const align = computed(() => (['left', 'center', 'right'].includes(d.value.align) ? d.value.align : 'start'))
const vars = computed(() => {
  const s = asResponsive(d.value.image_size)
  const px = (v) => `${Math.max(16, Math.min(200, Number(v) || 44))}px`
  return { '--pa-size': px(s.desktop), '--pa-size-t': px(s.tablet), '--pa-size-m': px(s.mobile) }
})
</script>

<style scoped>
.post-author { display: flex; align-items: center; gap: 12px; }
.post-author.is-center { justify-content: center; text-align: center; }
/* rtl:begin:ignore */
.post-author.is-right { flex-direction: row-reverse; text-align: right; }
.post-author.is-left { text-align: left; }
/* rtl:end:ignore */
.post-author-photo { width: var(--pa-size); height: var(--pa-size); border-radius: 50%; overflow: hidden; flex: none; display: block; }
.post-author-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.post-author-text { min-width: 0; }
.post-author-name { margin: 0; font-weight: 600; }
.post-author-name a { color: inherit; }
.post-author-meta { margin: 2px 0 0; opacity: .75; font-size: .9em; }
.post-author-bio { white-space: pre-line; }
@media (min-width: 768px) and (max-width: 1023px) { .post-author-photo { width: var(--pa-size-t, var(--pa-size)); height: var(--pa-size-t, var(--pa-size)); } }
@media (max-width: 767px) { .post-author-photo { width: var(--pa-size-m, var(--pa-size-t, var(--pa-size))); height: var(--pa-size-m, var(--pa-size-t, var(--pa-size))); } }
</style>
