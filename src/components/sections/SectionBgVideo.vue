<template>
  <video
      v-if="play && video.kind === 'file'"
      ref="videoEl"
      class="sb-bg-video"
      :src="video.src"
      :poster="video.poster || undefined"
      autoplay
      muted
      loop
      playsinline
      disablepictureinpicture
      preload="metadata"
      aria-hidden="true"
      tabindex="-1"
  />
  <div v-else-if="play" ref="frameBox" class="sb-bg-video sb-bg-video--embed" aria-hidden="true">
    <iframe
        :src="video.src"
        :style="frameSize"
        :title="t('Background video')"
        tabindex="-1"
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerpolicy="strict-origin-when-cross-origin"
        loading="lazy"
    />
  </div>
  <span ref="anchor" class="sb-bg-video-anchor" hidden />
</template>

<script setup>
/**
 * Muted, looping background video behind a section/block's content — an
 * uploaded file (<video>) or a YouTube / Vimeo embed (<iframe>).
 * Rendered only on the client, after mount: the server markup (and the
 * first paint) shows the poster, which is also the element's CSS
 * background — so nothing shifts when the video starts. Not rendered for
 * visitors who prefer reduced motion, or on phones when the block asks
 * for the poster there. Starts only when its section comes near the screen
 * (a video far down the page isn't downloaded until then) and pauses off it.
 */
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  // { kind: 'file' | 'youtube' | 'vimeo', src, poster, mobile } from buildBackground()
  video: { type: Object, required: true },
})

const play = ref(false)
const videoEl = ref(null)
const frameBox = ref(null)
const frameSize = ref({})
const anchor = ref(null)
const near = ref(false)
let seen = null
let queries = []
let resizeObserver = null

function decide() {
  if (typeof window === 'undefined' || !window.matchMedia) return
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const mobile = window.matchMedia('(max-width: 767px)').matches
  play.value = near.value && !!props.video?.src && !reducedMotion && (props.video.mobile || !mobile)
}

// An iframe can't use object-fit: size the 16:9 player so it covers the
// box (like background-size: cover), centered by CSS.
function fitFrame() {
  const box = frameBox.value
  if (!box) return
  const w = box.clientWidth
  const h = box.clientHeight
  if (!w || !h) return
  const ratio = 16 / 9
  frameSize.value = w / h > ratio
      ? { width: `${w}px`, height: `${Math.ceil(w / ratio)}px` }
      : { width: `${Math.ceil(h * ratio)}px`, height: `${h}px` }
}

async function start() {
  await nextTick()
  resizeObserver?.disconnect()
  resizeObserver = null

  if (props.video.kind !== 'file') {
    if (frameBox.value && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(fitFrame)
      resizeObserver.observe(frameBox.value)
    }
    fitFrame()
    return
  }

  const el = videoEl.value
  if (!el) return
  // Autoplay is only allowed when muted; set the property explicitly
  // (the attribute alone isn't reliable in every browser).
  el.muted = true
  el.play?.().catch(() => { /* blocked (e.g. low-power mode): the poster stays */ })
}

onMounted(() => {
  queries = ['(prefers-reduced-motion: reduce)', '(max-width: 767px)']
      .map((q) => window.matchMedia(q))
  queries.forEach((mq) => mq.addEventListener?.('change', decide))
  const box = anchor.value?.parentElement
  if (box && typeof IntersectionObserver !== 'undefined') {
    seen = new IntersectionObserver((entries) => {
      const on = entries.some((e) => e.isIntersecting)
      if (on && !near.value) { near.value = true; decide() }
      const el = videoEl.value
      if (el && near.value) { if (on) el.play?.().catch(() => {}); else el.pause?.() }
    }, { rootMargin: '300px 0px' })
    seen.observe(box)
  } else {
    near.value = true
  }
  decide()
})
onUnmounted(() => {
  seen?.disconnect()
  queries.forEach((mq) => mq.removeEventListener?.('change', decide))
  resizeObserver?.disconnect()
})

watch(() => [props.video?.src, props.video?.mobile], decide)
watch([play, () => props.video?.src, () => props.video?.kind], ([on]) => { if (on) start() })
</script>
