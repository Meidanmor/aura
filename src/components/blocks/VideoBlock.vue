<template>
  <div v-if="hasVideo" class="video-block" :style="cssVars">
    <div class="video-block__frame">
      <!-- YouTube / Vimeo: a lightweight cover until the visitor presses play
           (the players are heavy), unless autoplay is on. -->
      <template v-if="embedId">
        <iframe
            v-if="playing"
            class="video-block__media"
            :src="embedSrc"
            :title="d.title || 'Video'"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
        />
        <button
            v-else
            type="button"
            class="video-block__cover"
            :aria-label="`Play video${d.title ? ': ' + d.title : ''}`"
            @click="playing = true"
        >
          <img v-if="coverSrc" :src="coverSrc" :alt="''" class="video-block__media" loading="lazy" decoding="async" />
          <span class="video-block__play" aria-hidden="true">
            <q-icon :name="matPlayArrow" size="40px" />
          </span>
        </button>
      </template>

      <!-- Uploaded file or direct file URL -->
      <video
          v-else
          class="video-block__media"
          :src="fileSrc"
          :poster="posterSrc || undefined"
          :controls="d.controls !== false"
          :autoplay="!!d.autoplay"
          :muted="!!d.autoplay"
          :loop="!!d.loop"
          playsinline
          preload="metadata"
          :aria-label="d.title || 'Video'"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { matPlayArrow } from '@quasar/extras/material-icons'
import { setResponsiveVar, toCssLength, alignToFlex } from 'src/composables/useSectionStyle.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})

const d = computed(() => props.data.data || {})
const source = computed(() => d.value.source || 'youtube')

function youtubeId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/)
  return m ? m[1] : ''
}
function vimeoId(url) {
  const m = String(url || '').match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return m ? m[1] : ''
}

const embedId = computed(() => {
  if (source.value === 'youtube') return youtubeId(d.value.url)
  if (source.value === 'vimeo') return vimeoId(d.value.url)
  return ''
})

const posterSrc = computed(() => d.value.poster?.url || '')
const coverSrc = computed(() => posterSrc.value
    || (source.value === 'youtube' && embedId.value ? `https://i.ytimg.com/vi/${embedId.value}/hqdefault.jpg` : ''))

const fileSrc = computed(() => {
  if (source.value === 'file') return d.value.video_file?.url || ''
  if (source.value === 'url') return /^https?:\/\//i.test(d.value.url || '') ? d.value.url : ''
  return ''
})

const hasVideo = computed(() => !!(embedId.value || fileSrc.value))

// Autoplay skips the cover (browsers only allow muted autoplay).
const playing = ref(!!d.value.autoplay)
watch(() => d.value.autoplay, (v) => { playing.value = !!v })

const embedSrc = computed(() => {
  const id = embedId.value
  const auto = 1 // a click or autoplay setting both mean "start now"
  const muted = d.value.autoplay ? 1 : 0
  const loop = d.value.loop ? 1 : 0
  const controls = d.value.controls === false ? 0 : 1
  if (source.value === 'youtube') {
    const params = new URLSearchParams({ autoplay: auto, mute: muted, loop, controls, rel: 0, playsinline: 1 })
    if (loop) params.set('playlist', id) // YouTube only loops a playlist
    return `https://www.youtube-nocookie.com/embed/${id}?${params}`
  }
  const params = new URLSearchParams({ autoplay: auto, muted, loop, controls, dnt: 1 })
  return `https://player.vimeo.com/video/${id}?${params}`
})

const cssVars = computed(() => {
  const vars = {}
  setResponsiveVar(vars, '--vb-ratio', d.value.aspect_ratio || '16/9', (v) => (v ? String(v).replace('/', ' / ') : null))
  setResponsiveVar(vars, '--vb-maxw', d.value.max_width, toCssLength)
  setResponsiveVar(vars, '--vb-align', d.value.alignment || 'center', alignToFlex)
  const radius = toCssLength(d.value.border_radius)
  if (radius) vars['--vb-radius'] = radius
  return vars
})
</script>

<style scoped>
.video-block { display: flex; justify-content: var(--vb-align, center); }
.video-block__frame {
  position: relative;
  width: 100%;
  max-width: var(--vb-maxw, 100%);
  aspect-ratio: var(--vb-ratio, 16 / 9);
  overflow: hidden;
  border-radius: var(--vb-radius, 0);
  background: #000;
}
.video-block__media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  object-fit: cover;
  display: block;
}
video.video-block__media { object-fit: contain; }
.video-block__cover {
  position: absolute;
  inset: 0;
  padding: 0;
  border: 0;
  cursor: pointer;
  background: #111;
}
.video-block__play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.6);
  transition: transform 0.2s ease, background 0.2s ease;
}
.video-block__cover:hover .video-block__play,
.video-block__cover:focus-visible .video-block__play {
  transform: translate(-50%, -50%) scale(1.08);
  background: rgba(0, 0, 0, 0.8);
}
.video-block__cover:focus-visible { outline: 3px solid #fff; outline-offset: -3px; }

@media (max-width: 1023px) {
  .video-block { justify-content: var(--vb-align-t, center); }
  .video-block__frame { aspect-ratio: var(--vb-ratio-t, 16 / 9); max-width: var(--vb-maxw-t, 100%); }
}
@media (max-width: 767px) {
  .video-block { justify-content: var(--vb-align-m, center); }
  .video-block__frame { aspect-ratio: var(--vb-ratio-m, 16 / 9); max-width: var(--vb-maxw-m, 100%); }
}
</style>
