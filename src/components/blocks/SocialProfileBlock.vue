<template>
  <div v-if="user" ref="root" class="social-profile">
    <div ref="host" class="social-profile__host" />
    <!-- Nothing from TikTok loads until this tap, when the owner chose that. -->
    <button v-if="tapToLoad && !loaded" type="button" class="social-profile__load" @click="load">
      <span>{{ t('Watch on TikTok') }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * A TikTok profile, through TikTok's own creator embed: a blockquote its
 * embed.js turns into a frame. The blockquote is added by hand, because
 * embed.js replaces it and Vue must not patch over that.
 */
const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})
const d = computed(() => props.data.data || {})
const tapToLoad = computed(() => !!d.value.tap_to_load)
const user = computed(() => {
  const value = String(d.value.handle || '').trim()
  const match = value.match(/tiktok\.com\/@([\w.-]{2,30})/) || value.match(/^@?([\w.-]{2,30})$/)
  return match ? match[1] : ''
})

const root = ref(null)
const host = ref(null)
const loaded = ref(false)
let watcher = null

function load() {
  if (loaded.value || !host.value) return
  loaded.value = true
  const address = `https://www.tiktok.com/@${user.value}`
  const quote = document.createElement('blockquote')
  quote.className = 'tiktok-embed'
  quote.cite = address
  quote.dataset.uniqueId = user.value
  quote.dataset.embedType = 'creator'
  const section = document.createElement('section')
  const link = document.createElement('a')
  link.target = '_blank'
  link.rel = 'noopener'
  link.href = `${address}?refer=creator_embed`
  link.textContent = `@${user.value}`
  section.append(link)
  quote.append(section)
  host.value.append(quote)
  // embed.js looks for blockquotes when it loads, so a page opened later needs it again.
  document.getElementById('tiktok-embed-js')?.remove()
  const script = document.createElement('script')
  script.id = 'tiktok-embed-js'
  script.async = true
  script.src = 'https://www.tiktok.com/embed.js'
  document.body.append(script)
}

onMounted(() => {
  if (!user.value || tapToLoad.value) return
  if (!('IntersectionObserver' in window)) return load()
  watcher = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      watcher.disconnect()
      load()
    }
  }, { rootMargin: '300px' })
  if (root.value) watcher.observe(root.value)
})
onBeforeUnmount(() => watcher?.disconnect())
</script>

<style scoped>
.social-profile { position: relative; max-width: 780px; min-height: 420px; margin-inline: auto; }
.social-profile__load { position: absolute; inset: 0; width: 100%; display: grid; place-items: center; border: 0; border-radius: 12px; background: rgba(0, 0, 0, .05); cursor: pointer; color: inherit; font: inherit; }
.social-profile__load span { padding: 9px 18px; border-radius: 99px; background: rgba(0, 0, 0, .72); color: #fff; font-weight: 600; }
</style>
