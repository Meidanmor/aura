<template>
  <header v-if="author" class="author-profile" :class="[`is-${align}`, layoutClasses]" :style="vars">
    <div v-if="d.show_image !== false && author.image" class="author-profile-photo">
      <img :src="author.image.url" :width="author.image.width" :height="author.image.height" :alt="author.name">
    </div>
    <div class="author-profile-text">
      <h1 v-if="d.show_name !== false" v-bind="nameText">{{ author.name }}</h1>
      <p v-if="d.show_count !== false && list?.total" class="author-profile-count">{{ tn('{n} post', '{n} posts', Number(list.total)) }}</p>
      <p v-if="d.show_bio !== false && author.bio" class="author-profile-bio" v-bind="bioText">{{ author.bio }}</p>
    </div>
  </header>
</template>

<script setup>
import { computed, inject } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { asResponsive } from 'src/composables/useSectionStyle.js'
import { useI18n } from 'src/i18n/index.js'

/** "Author Profile" (author page template): the author's photo, name, bio and number of posts. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const list = inject('blogList', null)
const { tn } = useI18n()
const d = computed(() => props.data.data || {})
const author = computed(() => list?.value?.author || null)
const nameText = computed(() => textStyle(d.value, tsKeys('name'), 'headings'))
const bioText = computed(() => textStyle(d.value, tsKeys('bio')))
const align = computed(() => (['left', 'center', 'right'].includes(d.value.align) ? d.value.align : 'start'))
// Photo beside or above the text, per screen size.
const layoutClasses = computed(() => {
  const l = asResponsive(d.value.layout || 'row')
  return { 'ap-col-d': l.desktop === 'column', 'ap-col-t': l.tablet === 'column', 'ap-col-m': l.mobile === 'column' }
})
const vars = computed(() => {
  const s = asResponsive(d.value.image_size)
  const px = (v) => `${Math.max(32, Math.min(400, Number(v) || 120))}px`
  return { '--ap-size': px(s.desktop), '--ap-size-t': px(s.tablet), '--ap-size-m': px(s.mobile) }
})
</script>

<style scoped>
.author-profile { display: flex; align-items: center; gap: 24px; }
.author-profile-photo { width: var(--ap-size); height: var(--ap-size); border-radius: 50%; overflow: hidden; flex: none; }
.author-profile-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.author-profile-text { min-width: 0; }
.author-profile h1 { font-size: clamp(1.8rem, 3.5vw, 2.5rem); line-height: 1.15; margin: 0; font-weight: 600; }
.author-profile-count { margin: 4px 0 0; opacity: .7; }
.author-profile-bio { margin: 10px 0 0; max-width: 65ch; white-space: pre-line; }
.author-profile.is-center { text-align: center; justify-content: center; }
/* rtl:begin:ignore */
.author-profile.is-left { text-align: left; }
.author-profile.is-right { text-align: right; flex-direction: row-reverse; }
/* rtl:end:ignore */
.ap-col-d { flex-direction: column; }
.ap-col-d.is-center { align-items: center; }
/* rtl:begin:ignore */
.ap-col-d.is-left { align-items: flex-start; }
.ap-col-d.is-right { align-items: flex-end; }
/* rtl:end:ignore */
@media (min-width: 768px) and (max-width: 1023px) {
  .author-profile { flex-direction: row; }
  .author-profile.is-right { flex-direction: row-reverse; }
  .ap-col-t, .ap-col-t.is-right { flex-direction: column; }
  .author-profile-photo { width: var(--ap-size-t); height: var(--ap-size-t); }
}
@media (max-width: 767px) {
  .author-profile { flex-direction: row; }
  .author-profile.is-right { flex-direction: row-reverse; }
  .ap-col-m, .ap-col-m.is-right { flex-direction: column; }
  .author-profile-photo { width: var(--ap-size-m); height: var(--ap-size-m); }
}
.ap-col-d.is-center .author-profile-bio { margin-inline: auto; }
</style>
