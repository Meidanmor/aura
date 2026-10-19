<template>
  <div class="sb-bg-slides" :class="{ 'sb-bg-slides--zoom': slideshow.zoom && moving }" aria-hidden="true">
    <picture
        v-for="(slide, idx) in shown"
        :key="idx"
        class="sb-bg-slide"
        :class="{ 'is-active': idx === index }"
    >
      <source v-if="slide.mobile" media="(max-width: 767px)" :srcset="slide.mobile" />
      <img :src="slide.url" alt="" :loading="idx === 0 ? 'eager' : 'lazy'" decoding="async" />
    </picture>
  </div>
  <!-- The shown image's product tags (over the section's content layer, so they can be clicked). -->
  <ProductTags
      v-if="activeSlide?.tags?.length"
      :key="index"
      :tags="activeSlide.tags"
      :image="activeSlide.image"
      :mobile-image="activeSlide.mobileImage"
      :position="slideshow.position"
      @open="tagOpen = $event"
  />
  <div v-if="slideshow.counter && count > 1" class="sb-bg-counter" aria-hidden="true">
    <span class="sb-bg-counter__nums">{{ pad(index + 1) }} / {{ pad(count) }}</span>
    <span class="sb-bg-counter__bar"><i :key="`${index}-${restarts}`" :class="{ 'is-running': moving && count > 1 }" /></span>
  </div>
  <template v-if="slideshow.arrows && count > 1">
    <button type="button" class="sb-bg-arrow sb-bg-arrow--prev" :aria-label="t('Previous image')" @click.stop.prevent="go(-1)">
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </button>
    <button type="button" class="sb-bg-arrow sb-bg-arrow--next" :aria-label="t('Next image')" @click.stop.prevent="go(1)">
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </button>
  </template>
</template>

<script setup>
/**
 * A section's or block's slideshow background (bg_type "slideshow"): images
 * that change by themselves behind the content, fading (with a slow zoom
 * when chosen). The server and the first paint show only the first image
 * (the page's head preloads it when it's the first section); the others
 * are added once the page has loaded. Visitors who turned animations off
 * keep the first image.
 */
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import ProductTags from './ProductTags.vue'
import { useI18n } from 'src/i18n/index.js'

const { t } = useI18n()

const props = defineProps({
  // { slides: [{ url, mobile }], seconds, zoom, counter, arrows } from buildBackground()
  slideshow: { type: Object, required: true },
})

const count = computed(() => props.slideshow.slides.length)
const loaded = ref(false)
const moving = ref(false)
const index = ref(0)
const shown = computed(() => (loaded.value ? props.slideshow.slides : props.slideshow.slides.slice(0, 1)))
const pad = (n) => String(n).padStart(2, '0')
const activeSlide = computed(() => props.slideshow.slides[index.value] || null)
const tagOpen = ref(false)

let timer = null
let reduced = null

function stop() {
  if (timer) clearInterval(timer)
  timer = null
}
function start() {
  stop()
  moving.value = !!loaded.value && !reduced?.matches
  if (!moving.value || count.value < 2) return
  timer = setInterval(() => {
    if (document.hidden || tagOpen.value) return
    index.value = (index.value + 1) % count.value
  }, props.slideshow.seconds * 1000)
}

// Arrows: show the previous / next image now, and give it its full time.
const restarts = ref(0)
function go(step) {
  loaded.value = true
  index.value = (index.value + step + count.value) % count.value
  restarts.value++
  start()
}

function whenLoaded(fn) {
  if (document.readyState === 'complete') setTimeout(fn, 300)
  else window.addEventListener('load', () => setTimeout(fn, 300), { once: true })
}

onMounted(() => {
  reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null
  reduced?.addEventListener?.('change', start)
  whenLoaded(() => {
    loaded.value = true
    start()
  })
})
onUnmounted(() => {
  stop()
  reduced?.removeEventListener?.('change', start)
})
watch(() => [props.slideshow.seconds, count.value], () => {
  if (index.value >= count.value) index.value = 0
  start()
})
</script>

<style>
.sb-bg-slides {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}
.sb-bg-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 1.2s ease;
}
.sb-bg-slide.is-active { opacity: 1; }
.sb-bg-slide img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: var(--sb-bg-pos, center center);
}
.sb-bg-slides--zoom .sb-bg-slide.is-active img {
  animation: sb-bg-zoom calc(var(--sb-slide-s, 6s) + 1.2s) ease-out forwards;
}
@keyframes sb-bg-zoom {
  from { transform: scale(1); }
  to { transform: scale(1.08); }
}

.sb-bg-counter {
  position: absolute;
  inset-inline-end: 24px;
  bottom: 20px;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
  color: inherit;
  pointer-events: none;
}
/* The line's track is a faint copy of the text colour; the progress fills it in full colour. */
.sb-bg-counter__bar {
  position: relative;
  width: 72px;
  height: 2px;
  overflow: hidden;
}
.sb-bg-counter__bar::before {
  content: '';
  position: absolute;
  inset: 0;
  background: currentColor;
  opacity: 0.25;
}
.sb-bg-counter__bar i {
  position: absolute;
  inset: 0;
  background: currentColor;
  transform-origin: left center;
  transform: scaleX(0);
}
[dir="rtl"] .sb-bg-counter__bar i { transform-origin: right center; }
.sb-bg-counter__bar i.is-running { animation: sb-bg-progress var(--sb-slide-s, 6s) linear forwards; }
@keyframes sb-bg-progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* Arrows at the sides, in the section's text colour (previous on the start side). */
.sb-bg-arrow {
  position: absolute;
  top: 50%;
  z-index: 3;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}
.sb-bg-arrow:hover { opacity: 1; }
.sb-bg-arrow:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; opacity: 1; }
.sb-bg-arrow--prev { inset-inline-start: 12px; }
.sb-bg-arrow--next { inset-inline-end: 12px; }
[dir="rtl"] .sb-bg-arrow svg { transform: scaleX(-1); }

@media (max-width: 1023px) {
  .sb-bg-slide img { object-position: var(--sb-bg-pos-t, var(--sb-bg-pos, center center)); }
}
@media (max-width: 767px) {
  .sb-bg-slide img { object-position: var(--sb-bg-pos-m, var(--sb-bg-pos-t, var(--sb-bg-pos, center center))); }
  .sb-bg-counter { inset-inline-end: 16px; bottom: 14px; }
  .sb-bg-arrow { width: 36px; height: 36px; }
  .sb-bg-arrow--prev { inset-inline-start: 4px; }
  .sb-bg-arrow--next { inset-inline-end: 4px; }
}
@media (prefers-reduced-motion: reduce) {
  .sb-bg-slide { transition: none; }
}
</style>
