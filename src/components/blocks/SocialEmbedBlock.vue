<template>
  <div v-if="posts.length" class="social-embed" :style="cssVars">
    <div v-for="post in posts" :key="post.key" class="social-embed__item" :class="`is-${post.network}`">
      <iframe
        v-if="shown[post.key]"
        :src="post.src"
        :title="post.network === 'tiktok' ? 'TikTok' : 'Instagram'"
        loading="lazy"
        allow="encrypted-media; fullscreen"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"
      />
      <!-- Their code and cookies load only after a tap: it keeps the page fast and asks nothing of the cookie banner. -->
      <button v-else type="button" class="social-embed__load" @click="shown[post.key] = true">
        <img v-if="post.cover" :src="post.cover" alt="" loading="lazy" decoding="async">
        <span>{{ post.network === 'tiktok' ? t('Watch on TikTok') : t('See on Instagram') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'

/** Instagram / TikTok posts by their address. Only addresses of a real post become a frame. */
const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})
const d = computed(() => props.data.data || {})
const shown = reactive({})

function parse(url) {
  const value = String(url || '').trim()
  const ig = value.match(/^https:\/\/(?:www\.)?instagram\.com\/(?:[\w.]+\/)?(p|reel|tv)\/([\w-]{5,20})/)
  if (ig) return { network: 'instagram', key: ig[2], src: `https://www.instagram.com/${ig[1]}/${ig[2]}/embed/` }
  const tk = value.match(/^https:\/\/(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d{8,25})/)
  if (tk) return { network: 'tiktok', key: tk[1], src: `https://www.tiktok.com/embed/v2/${tk[1]}` }
  return null
}
const posts = computed(() => (d.value.items || []).map((item) => {
  const post = parse(item.url)
  return post && { ...post, cover: item.cover?.url || (typeof item.cover === 'string' ? item.cover : '') }
}).filter(Boolean))
const cssVars = computed(() => {
  const vars = {}
  setResponsiveVar(vars, '--se-cols', d.value.columns)
  setResponsiveVar(vars, '--se-gap', d.value.gap, toCssLength)
  return vars
})
</script>

<style scoped>
.social-embed { display: grid; grid-template-columns: repeat(var(--se-cols, 3), minmax(0, 1fr)); gap: var(--se-gap, 16px); }
@media (min-width: 768px) and (max-width: 1023px) {
  .social-embed { grid-template-columns: repeat(var(--se-cols-t, var(--se-cols, 2)), minmax(0, 1fr)); gap: var(--se-gap-t, var(--se-gap, 16px)); }
}
@media (max-width: 767px) {
  .social-embed { grid-template-columns: repeat(var(--se-cols-m, var(--se-cols-t, var(--se-cols, 1))), minmax(0, 1fr)); gap: var(--se-gap-m, var(--se-gap-t, var(--se-gap, 16px))); }
}
.social-embed__item { position: relative; aspect-ratio: 4 / 5.6; overflow: hidden; border-radius: 12px; background: rgba(0, 0, 0, .05); }
.social-embed__item.is-tiktok { aspect-ratio: 9 / 16; }
.social-embed iframe { width: 100%; height: 100%; border: 0; }
.social-embed__load { position: absolute; inset: 0; width: 100%; display: grid; place-items: center; border: 0; padding: 0; background: none; cursor: pointer; color: inherit; font: inherit; }
.social-embed__load img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.social-embed__load span { position: relative; padding: 9px 18px; border-radius: 99px; background: rgba(0, 0, 0, .72); color: #fff; font-weight: 600; }
</style>
