<template>
  <video
      v-if="play"
      ref="videoEl"
      class="sb-bg-video"
      :src="video.src"
      :poster="video.poster || undefined"
      autoplay
      muted
      loop
      playsinline
      disablepictureinpicture
      preload="auto"
      aria-hidden="true"
      tabindex="-1"
  />
</template>

<script setup>
/**
 * Muted, looping background video behind a section/block's content.
 * Rendered only on the client, after mount: the server markup (and the
 * first paint) shows the poster, which is also the element's CSS
 * background — so nothing shifts when the video starts. Not rendered for
 * visitors who prefer reduced motion, or on phones when the block asks
 * for the poster there.
 */
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  // { src, poster, mobile } from buildBackground()
  video: { type: Object, required: true },
})

const play = ref(false)
const videoEl = ref(null)
let queries = []

function decide() {
  if (typeof window === 'undefined' || !window.matchMedia) return
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const mobile = window.matchMedia('(max-width: 767px)').matches
  play.value = !!props.video?.src && !reducedMotion && (props.video.mobile || !mobile)
}

async function start() {
  await nextTick()
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
  decide()
})
onUnmounted(() => {
  queries.forEach((mq) => mq.removeEventListener?.('change', decide))
})

watch(() => [props.video?.src, props.video?.mobile], decide)
watch([play, () => props.video?.src], ([on]) => { if (on) start() })
</script>
