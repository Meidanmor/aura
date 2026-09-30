<template>
  <!-- ===== Hero slides: one full-width slide at a time ===== -->
  <div v-if="source === 'slides'" class="carousel-block" :style="cssVars">
    <q-carousel
        v-if="slides.length"
        v-model="slideIndex"
        class="cb-hero"
        animated
        swipeable
        height="auto"
        :infinite="loop"
        :autoplay="heroAutoplay"
        :arrows="!!d.arrows && slides.length > 1"
        :navigation="!!d.dots && slides.length > 1"
        :prev-icon="matChevronLeft"
        :next-icon="matChevronRight"
        transition-prev="slide-right"
        transition-next="slide-left"
        @mouseenter="paused = true"
        @mouseleave="paused = false"
        @focusin="paused = true"
        @focusout="paused = false"
    >
      <q-carousel-slide v-for="(slide, idx) in slides" :key="idx" :name="idx" class="cb-slide">
        <picture class="cb-slide__media">
          <source v-if="slide.mobileSrc" media="(max-width: 767px)" :srcset="slide.mobileSrc" />
          <img
              :src="slide.src"
              :alt="slide.alt || ''"
              :width="slide.width || undefined"
              :height="slide.height || undefined"
              :loading="idx === 0 ? 'eager' : 'lazy'"
              :fetchpriority="idx === 0 ? 'high' : undefined"
              decoding="async"
          />
        </picture>
        <div class="cb-slide__overlay" :style="overlayStyle(slide)" />
        <div class="cb-slide__content" :class="`cb-slide__content--${slide.content_align || 'center'}`" :style="{ color: resolveGlobalColor(slide.text_color) || '#fff' }">
          <h2 v-if="slide.title" class="cb-slide__title"><span v-html="sanitizeSectionText(slide.title)" /></h2>
          <p v-if="slide.text" class="cb-slide__text">{{ slide.text }}</p>
          <q-btn
              v-if="slide.button_text && slide.button_url"
              v-bind="linkAttrs(slide.button_url)"
              :label="slide.button_text"
              class="cb-slide__btn"
              :class="`cb-slide__btn--${d.button_style || 'light'}`"
              :outline="d.button_style === 'outline'"
              unelevated
              no-caps
              size="lg"
          />
        </div>
      </q-carousel-slide>
    </q-carousel>
  </div>

  <!-- ===== Multi-item row: images / logos / products / categories ===== -->
  <div v-else-if="items.length" class="carousel-block cb-row" :class="`cb-row--${source}`" :style="cssVars"
       @mouseenter="paused = true" @mouseleave="paused = false" @focusin="paused = true" @focusout="paused = false">
    <div class="cb-row__viewport">
      <button v-if="d.arrows && pages > 1" type="button" class="cb-row__arrow cb-row__arrow--prev" aria-label="Previous" @click="go(-1)">
        <q-icon :name="matChevronLeft" size="28px" />
      </button>

      <div
          ref="trackRef"
          class="cb-row__track"
          tabindex="0"
          role="region"
          aria-roledescription="carousel"
          :aria-label="ariaLabel"
          @scroll.passive="onScroll"
          @touchstart.passive="paused = true"
      >
        <div v-for="(item, idx) in items" :key="item.key || idx" class="cb-row__item">
          <!-- Products -->
          <ProductCard v-if="source === 'products'" :product="item" />

          <!-- Categories -->
          <router-link v-else-if="source === 'categories'" :to="`/product-category/${item.slug}`" class="cb-cat">
            <img v-if="item.image" :src="item.image" :alt="item.name" loading="lazy" class="cb-cat__img" />
            <span class="cb-cat__shade" aria-hidden="true" />
            <span class="cb-cat__name">{{ item.name }}</span>
          </router-link>

          <!-- Images & logos -->
          <component
              :is="item.link_url ? (isInternal(item.link_url) ? RouterLink : 'a') : 'div'"
              v-else
              v-bind="item.link_url ? imageLinkAttrs(item) : {}"
              class="cb-img"
          >
            <img
                :src="item.src"
                :alt="item.alt || ''"
                :width="item.width || undefined"
                :height="item.height || undefined"
                loading="lazy"
                decoding="async"
            />
          </component>
        </div>
      </div>

      <button v-if="d.arrows && pages > 1" type="button" class="cb-row__arrow cb-row__arrow--next" aria-label="Next" @click="go(1)">
        <q-icon :name="matChevronRight" size="28px" />
      </button>
    </div>

    <div v-if="d.dots && pages > 1" class="cb-row__dots">
      <button
          v-for="p in pages"
          :key="p"
          type="button"
          class="cb-row__dot"
          :class="{ 'is-active': p - 1 === page }"
          :aria-label="`Go to slide ${p}`"
          :aria-current="p - 1 === page ? 'true' : undefined"
          @click="goTo(p - 1)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { matChevronLeft, matChevronRight } from '@quasar/extras/material-icons'
import ProductCard from '../shop/ProductCard.vue'
import productsStore from 'src/stores/products'
import { useBlockQuery } from 'src/composables/useBlockQuery.js'
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})

const d = computed(() => props.data.data || {})
const source = computed(() => d.value.source || 'slides')
const loop = computed(() => d.value.loop !== false)

const isInternal = (url) => String(url).startsWith('/') && !String(url).startsWith('//')
const imgUrl = (img) => (typeof img === 'string' ? img : img?.url) || ''

function linkAttrs(url) {
  if (url.startsWith('#')) return { href: url, type: 'a' }
  return isInternal(url) ? { to: url } : { href: url, type: 'a' }
}
function imageLinkAttrs(item) {
  const attrs = isInternal(item.link_url) ? { to: item.link_url } : { href: item.link_url }
  if (item.new_tab) Object.assign(attrs, { target: '_blank', rel: 'noopener noreferrer' })
  return attrs
}

/* ---------- Data ---------- */

const slides = computed(() => (d.value.slides || [])
    .map((s) => ({ ...s, src: imgUrl(s.image), mobileSrc: imgUrl(s.mobile_image), width: s.image?.width, height: s.image?.height }))
    .filter((s) => s.src))

const queryKey = () => JSON.stringify([
  source.value, d.value.query_type, d.value.category_ids, d.value.tag_ids, d.value.product_ids,
  d.value.limit, d.value.hide_out_of_stock, d.value.slide_category_ids,
])
const { data: fetched } = useBlockQuery(props.blockId, queryKey, (ssrContext) => {
  if (source.value === 'products') return productsStore.queryProducts(d.value, ssrContext)
  if (source.value === 'categories') return productsStore.queryCategories(d.value.slide_category_ids || [], ssrContext)
  return Promise.resolve([])
})

const items = computed(() => {
  if (source.value === 'images' || source.value === 'logos') {
    return (d.value.images || [])
        .map((img, i) => ({ ...img, key: i, src: imgUrl(img.image), width: img.image?.width, height: img.image?.height }))
        .filter((img) => img.src)
  }
  if (source.value === 'products' || source.value === 'categories') return fetched.value || []
  return []
})

const ariaLabel = computed(() => ({ images: 'Image carousel', logos: 'Brands', products: 'Products', categories: 'Categories' }[source.value] || 'Carousel'))

/* ---------- Autoplay (paused on hover/focus/touch and for reduced motion) ---------- */

const paused = ref(false)
const reducedMotion = ref(false)
const autoplayMs = computed(() => (d.value.autoplay && !reducedMotion.value ? Math.max(2, Number(d.value.autoplay_seconds) || 5) * 1000 : 0))
const heroAutoplay = computed(() => (paused.value ? false : autoplayMs.value || false))
const slideIndex = ref(0)

/* ---------- Scroll-snap row ---------- */

const trackRef = ref(null)
const pages = ref(1)
const page = ref(0)
let resizeObserver = null
let timer = null

function measure() {
  const el = trackRef.value
  if (!el) return
  pages.value = Math.max(1, Math.round(el.scrollWidth / el.clientWidth))
  onScroll()
}

function onScroll() {
  const el = trackRef.value
  if (!el) return
  const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
  page.value = atEnd ? pages.value - 1 : Math.round(el.scrollLeft / el.clientWidth)
}

function goTo(p) {
  const el = trackRef.value
  if (!el) return
  el.scrollTo({ left: p * el.clientWidth, behavior: reducedMotion.value ? 'auto' : 'smooth' })
}

function go(step) {
  const next = page.value + step
  if (next >= pages.value) return goTo(loop.value ? 0 : pages.value - 1)
  if (next < 0) return goTo(loop.value ? pages.value - 1 : 0)
  goTo(next)
}

function restartTimer() {
  clearInterval(timer)
  if (source.value !== 'slides' && autoplayMs.value) {
    timer = setInterval(() => {
      if (!paused.value && pages.value > 1) go(1)
    }, autoplayMs.value)
  }
}

function observeTrack(el, old) {
  if (!resizeObserver) return
  if (old) resizeObserver.unobserve(old)
  if (el) { resizeObserver.observe(el); measure() }
}
// The track element comes and goes with the source/items (v-if).
watch(trackRef, observeTrack)

onMounted(() => {
  reducedMotion.value = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(measure)
    observeTrack(trackRef.value, null)
  }
  restartTimer()
})
watch([autoplayMs, source], restartTimer)
watch(() => items.value.length, () => requestAnimationFrame(measure))
onBeforeUnmount(() => {
  clearInterval(timer)
  resizeObserver?.disconnect()
})

/* ---------- Styles ---------- */

function overlayStyle(slide) {
  const color = resolveGlobalColor(slide.overlay_color)
  if (!color) return { display: 'none' }
  const o = Number(slide.overlay_opacity)
  return { background: color, opacity: String((Number.isFinite(o) ? o : 30) / 100) }
}

const cssVars = computed(() => {
  const vars = {}
  const defaultsPerView = source.value === 'logos' ? { desktop: 6, tablet: 4, mobile: 3 } : { desktop: 4, tablet: 3, mobile: 2 }
  setResponsiveVar(vars, '--cb-per', d.value.items_per_view || defaultsPerView, (v) => (v ? Math.max(1, Math.min(8, Number(v))) : null))
  setResponsiveVar(vars, '--cb-gap', d.value.gap, toCssLength)
  setResponsiveVar(vars, '--cb-h', d.value.slide_height || { desktop: '560px', tablet: '440px', mobile: '380px' }, toCssLength)
  setResponsiveVar(vars, '--cb-title', d.value.title_size, toCssLength)
  setResponsiveVar(vars, '--cb-img-h', d.value.image_height, toCssLength)
  const radius = toCssLength(d.value.border_radius)
  if (radius) vars['--cb-radius'] = radius
  const control = resolveGlobalColor(d.value.control_color)
  if (control) vars['--cb-control'] = control
  if (d.value.grayscale) vars['--cb-gray'] = '1'
  return vars
})
</script>

<style scoped>
/* ---------- Hero slides ---------- */
.cb-hero { border-radius: var(--cb-radius, 0); overflow: hidden; background: transparent; }
.cb-hero :deep(.q-carousel__slide.cb-slide) {
  position: relative;
  padding: 0;
  height: var(--cb-h, 560px);
  display: flex;
}
.cb-slide__media,
.cb-slide__media img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.cb-slide__overlay { position: absolute; inset: 0; pointer-events: none; }
.cb-slide__content {
  position: relative;
  z-index: 1;
  margin: auto;
  width: 100%;
  max-width: 1200px;
  padding: 40px 72px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.cb-slide__content--left { align-items: flex-start; text-align: left; }
.cb-slide__content--center { align-items: center; text-align: center; }
.cb-slide__content--right { align-items: flex-end; text-align: right; }
.cb-slide__title { margin: 0; font-size: var(--cb-title, 3rem); line-height: 1.1; font-weight: 700; color: inherit; }
.cb-slide__text { margin: 0; max-width: 640px; font-size: 1.15rem; opacity: 0.95; }
.cb-slide__btn--light { background: #fff !important; color: #111 !important; }
.cb-slide__btn--secondary { background: var(--q-secondary) !important; color: #fff !important; }
.cb-slide__btn--outline { color: #fff !important; }
.cb-hero :deep(.q-carousel__arrow .q-btn),
.cb-hero :deep(.q-carousel__navigation .q-btn) { color: var(--cb-control, #fff); }

/* ---------- Multi-item row ---------- */
.cb-row { position: relative; }
.cb-row__viewport { position: relative; }
.cb-row__track {
  --cb-gap-now: var(--cb-gap, 16px);
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: calc((100% - (var(--cb-per, 4) - 1) * var(--cb-gap-now)) / var(--cb-per, 4));
  gap: var(--cb-gap-now);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}
.cb-row__track::-webkit-scrollbar { display: none; }
.cb-row__track:focus-visible { outline: 2px solid var(--cb-control, currentColor); outline-offset: 4px; }
.cb-row__item { scroll-snap-align: start; min-width: 0; }

.cb-row__arrow {
  position: absolute;
  top: 50%;
  z-index: 2;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.92);
  color: var(--cb-control, #333);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.cb-row__arrow--prev { left: -8px; }
.cb-row__arrow--next { right: -8px; }
.cb-row__arrow:focus-visible { outline: 2px solid var(--cb-control, #333); outline-offset: 2px; }

.cb-row__dots { display: flex; justify-content: center; gap: 8px; margin-top: 16px; }
.cb-row__dot {
  width: 9px;
  height: 9px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  background: #bdbdbd;
  transition: background 0.2s, transform 0.2s;
}
.cb-row__dot.is-active { background: var(--cb-control, #333); transform: scale(1.25); }

/* Images & logos */
.cb-img { display: flex; align-items: center; justify-content: center; height: 100%; border-radius: var(--cb-radius, 0); overflow: hidden; }
.cb-img img { display: block; width: 100%; height: var(--cb-img-h, auto); object-fit: cover; }
.cb-row--logos .cb-img img {
  width: auto;
  max-width: 100%;
  height: var(--cb-img-h, 60px);
  object-fit: contain;
  filter: grayscale(var(--cb-gray, 0));
  opacity: calc(1 - var(--cb-gray, 0) * 0.35);
  transition: filter 0.2s, opacity 0.2s;
}
.cb-row--logos .cb-img:hover img,
.cb-row--logos .cb-img:focus-visible img { filter: none; opacity: 1; }

/* Categories */
.cb-cat {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
  border-radius: var(--cb-radius, 8px);
  overflow: hidden;
  background: #eee;
  text-decoration: none;
}
.cb-cat__img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
.cb-cat__shade { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.25); }
.cb-cat__name { position: relative; color: #fff; font-weight: 600; font-size: 1.15rem; text-align: center; padding: 8px; }
.cb-cat:hover .cb-cat__img { transform: scale(1.06); }

@media (max-width: 1023px) {
  .cb-hero :deep(.q-carousel__slide.cb-slide) { height: var(--cb-h-t, 440px); }
  .cb-slide__title { font-size: var(--cb-title-t, 2.4rem); }
  .cb-row__track {
    --cb-gap-now: var(--cb-gap-t, 16px);
    grid-auto-columns: calc((100% - (var(--cb-per-t, 3) - 1) * var(--cb-gap-now)) / var(--cb-per-t, 3));
  }
  .cb-img img { height: var(--cb-img-h-t, auto); }
  .cb-row--logos .cb-img img { height: var(--cb-img-h-t, 60px); }
}
@media (max-width: 767px) {
  .cb-hero :deep(.q-carousel__slide.cb-slide) { height: var(--cb-h-m, 380px); }
  .cb-slide__content { padding: 32px 24px 48px; }
  .cb-slide__title { font-size: var(--cb-title-m, 1.9rem); }
  .cb-slide__text { font-size: 1rem; }
  .cb-row__track {
    --cb-gap-now: var(--cb-gap-m, 12px);
    grid-auto-columns: calc((100% - (var(--cb-per-m, 2) - 1) * var(--cb-gap-now)) / var(--cb-per-m, 2));
  }
  .cb-row__arrow { display: none; } /* swipe on touch screens */
  .cb-img img { height: var(--cb-img-h-m, auto); }
  .cb-row--logos .cb-img img { height: var(--cb-img-h-m, 48px); }
}
</style>
