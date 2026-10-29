<template>
  <div class="authors-list" :class="`is-${align}`" :style="vars">
    <h1 v-bind="headingText">{{ d.title || t('Authors') }}</h1>
    <p v-if="authors && !authors.length" class="authors-empty">{{ t('No authors yet.') }}</p>
    <div v-else-if="authors" class="authors-grid">
      <router-link v-for="a in authors" :key="a.id" :to="a.url || '/blog'" class="author-card">
        <span v-if="d.show_image !== false && a.image" class="author-card-photo">
          <img :src="a.image.url" :width="a.image.width" :height="a.image.height" alt="" loading="lazy">
        </span>
        <span class="author-card-name" v-bind="nameText">{{ a.name }}</span>
        <span v-if="d.show_count !== false" class="author-card-count">{{ tn('{n} post', '{n} posts', a.count) }}</span>
        <span v-if="d.show_bio !== false && a.bio" class="author-card-bio" v-bind="bioText">{{ a.bio }}</span>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { asResponsive } from 'src/composables/useSectionStyle.js'
import { useI18n } from 'src/i18n/index.js'

/** "Authors Grid" (authors page template): every author with posts, linking to their page. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const list = inject('blogAuthors', null)
const { t, tn } = useI18n()
const d = computed(() => props.data.data || {})
const authors = computed(() => list?.value?.authors || null)
const headingText = computed(() => textStyle(d.value, tsKeys('heading'), 'headings'))
const nameText = computed(() => textStyle(d.value, tsKeys('name'), 'headings'))
const bioText = computed(() => textStyle(d.value, tsKeys('bio')))
const align = computed(() => (['left', 'center', 'right'].includes(d.value.align) ? d.value.align : 'start'))
const vars = computed(() => {
  const c = asResponsive(d.value.columns || { desktop: 3, tablet: 2, mobile: 1 })
  const s = asResponsive(d.value.image_size)
  const n = (v, def) => Math.max(1, Math.min(6, Number(v) || def))
  const px = (v) => `${Math.max(32, Math.min(300, Number(v) || 96))}px`
  return {
    '--al-cols': n(c.desktop, 3), '--al-cols-t': n(c.tablet, 2), '--al-cols-m': n(c.mobile, 1),
    '--al-size': px(s.desktop), '--al-size-t': px(s.tablet), '--al-size-m': px(s.mobile),
  }
})
</script>

<style scoped>
.authors-list h1 { font-size: clamp(2rem, 4vw, 2.75rem); line-height: 1.15; margin: 0 0 24px; font-weight: 600; }
.authors-grid { display: grid; grid-template-columns: repeat(var(--al-cols), minmax(0, 1fr)); gap: 32px 24px; }
.author-card { display: flex; flex-direction: column; gap: 6px; color: inherit; text-decoration: none; }
.author-card-photo { width: var(--al-size); height: var(--al-size); border-radius: 50%; overflow: hidden; display: block; margin-bottom: 6px; }
.author-card-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.author-card-name { font-weight: 600; font-size: 1.15rem; }
.author-card-count { opacity: .7; font-size: .9em; }
.author-card-bio { opacity: .85; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.authors-list.is-center { text-align: center; }
.authors-list.is-center .author-card { align-items: center; }
/* rtl:begin:ignore */
.authors-list.is-left { text-align: left; }
.authors-list.is-right { text-align: right; }
.authors-list.is-right .author-card { align-items: flex-end; }
/* rtl:end:ignore */
.authors-empty { padding: 24px 0; }
@media (min-width: 768px) and (max-width: 1023px) {
  .authors-grid { grid-template-columns: repeat(var(--al-cols-t, var(--al-cols)), minmax(0, 1fr)); }
  .author-card-photo { width: var(--al-size-t, var(--al-size)); height: var(--al-size-t, var(--al-size)); }
}
@media (max-width: 767px) {
  .authors-grid { grid-template-columns: repeat(var(--al-cols-m, var(--al-cols-t, var(--al-cols))), minmax(0, 1fr)); }
  .author-card-photo { width: var(--al-size-m, var(--al-size-t, var(--al-size))); height: var(--al-size-m, var(--al-size-t, var(--al-size))); }
}
</style>
