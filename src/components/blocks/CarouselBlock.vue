<template>
  <!-- ===== Hero slides: one full-width slide at a time ===== -->
  <div v-if="source === 'slides'" class="carousel-block" :class="{ 'cb-zoom': d.slow_zoom && !reducedMotion }" :style="cssVars">
    <q-carousel
        v-if="slides.length"
        v-model="slideIndex"
        class="cb-hero"
        :class="arrowsShow !== 'both' ? `cb-only-${arrowsShow}` : ''"
        animated
        swipeable
        height="auto"
        :infinite="loop"
        :autoplay="heroAutoplay"
        :arrows="!!d.arrows && slides.length > 1"
        :navigation="!!d.dots && slides.length > 1"
        :prev-icon="matChevronLeft"
        :next-icon="matChevronRight"
        :transition-prev="fade ? 'fade' : 'slide-right'"
        :transition-next="fade ? 'fade' : 'slide-left'"
        :transition-duration="fade ? 900 : 300"
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
              :srcset="picked && idx === 0 ? undefined : slide.srcset"
              :sizes="picked && idx === 0 || !slide.srcset ? undefined : LAZY_SIZES"
              v-fit-sizes
              :alt="slide.alt || ''"
              :width="slide.width || undefined"
              :height="slide.height || undefined"
              :loading="picked && idx === 0 ? 'eager' : 'lazy'"
              :fetchpriority="picked && idx === 0 ? 'high' : undefined"
              decoding="async"
          />
        </picture>
        <div class="cb-slide__overlay" :style="overlayStyle(slide)" />
        <ProductTags v-if="slide.tags?.length" :tags="slide.tags" :image="slide.image" :mobile-image="slide.mobile_image" @open="paused = $event" />
        <div class="cb-slide__content" :class="`cb-slide__content--${slide.content_align || 'center'}`" :style="{ color: resolveGlobalColor(slide.text_color) || '#fff' }">
          <h2 v-if="slide.title" class="cb-slide__title" v-bind="titleText"><span v-html="sanitizeSectionText(slide.title)" /></h2>
          <p v-if="slide.text" class="cb-slide__text" v-bind="slideText">{{ slide.text }}</p>
          <q-btn
              v-if="slide.button_text && slide.button_url"
              v-bind="linkAttrs(slide.button_url)"
              :label="slide.button_text"
              class="cb-slide__btn"
              :class="[`cb-slide__btn--${d.button_style || 'light'}`, buttonText.class]"
              :style="buttonText.style"
              :outline="d.button_style === 'outline'"
              unelevated
              no-caps
              :size="['sm', 'md', 'lg'].includes(d.button_size) ? d.button_size : 'lg'"
          />
        </div>
      </q-carousel-slide>
    </q-carousel>
    <!-- "01 / 03" and a line that fills while the slide is shown (with autoplay). -->
    <div v-if="d.counter && slides.length > 1" class="cb-counter" aria-hidden="true">
      <span>{{ pad(slideIndex + 1) }} / {{ pad(slides.length) }}</span>
      <span class="cb-counter__bar"><i :key="slideIndex" :class="{ 'is-running': !!heroAutoplay }" :style="barStyle" /></span>
    </div>
  </div>

  <!-- ===== Multi-item row: images / logos / products / categories ===== -->
  <div v-else-if="items.length" class="carousel-block cb-row" :class="rowClasses" :style="cssVars"
       @mouseenter="paused = true" @mouseleave="paused = false" @focusin="paused = true" @focusout="paused = false">
    <!-- Arrows together above the row, at the end. -->
    <div v-if="showArrows && arrowsAt === 'top_end'" class="cb-row__nav cb-row__nav--top">
      <button v-if="showPrev" type="button" class="cb-row__arrow cb-row__arrow--prev" :aria-label="t('Previous')" @click="go(-1)">
        <svg viewBox="8.59 6 7.41 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="currentColor" d="M14.59 6L16 7.41 11.42 12l4.58 4.59L14.59 18 8.59 12z"/>
        </svg>
      </button>
      <button v-if="showNext" type="button" class="cb-row__arrow cb-row__arrow--next" :aria-label="t('Next')" @click="go(1)">
        <svg viewBox="8.59 6 7.41 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    </div>

    <div class="cb-row__viewport">
      <!-- At both sides: the same arrows as the product page's related products (AppCarousel). -->
      <button v-if="showArrows && showPrev && arrowsAt === 'sides'" type="button" class="cb-row__arrow cb-row__arrow--prev cb-row__arrow--side" :aria-label="t('Previous')" @click="go(-1)">
        <svg viewBox="8.59 6 7.41 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="currentColor" d="M14.59 6L16 7.41 11.42 12l4.58 4.59L14.59 18 8.59 12z"/>
        </svg>
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
          <LoopCard v-if="card && (source === 'products' || source === 'categories')" :sections="card" :type="source === 'products' ? 'product' : 'category'" :item="item" :priority="picked && idx < 3" />
          <ProductCard v-else-if="source === 'products'" :product="item" :priority="picked && idx < 3" />

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
                :srcset="picked && idx === 0 ? undefined : item.srcset"
                :sizes="picked && idx === 0 || !item.srcset ? undefined : LAZY_SIZES"
                v-fit-sizes
                :alt="item.alt || ''"
                :width="item.width || undefined"
                :height="item.height || undefined"
                :loading="picked && idx === 0 ? 'eager' : 'lazy'"
                :fetchpriority="picked && idx === 0 ? 'high' : undefined"
                decoding="async"
            />
          </component>
        </div>
      </div>

      <button v-if="showArrows && showNext && arrowsAt === 'sides'" type="button" class="cb-row__arrow cb-row__arrow--next cb-row__arrow--side" :aria-label="t('Next')" @click="go(1)">
        <svg viewBox="8.59 6 7.41 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    </div>

    <!-- Arrows together below the row (the dots between them in the middle, or before them at the end). -->
    <div v-if="showArrows && (arrowsAt === 'bottom_end' || arrowsAt === 'bottom_center')" class="cb-row__nav" :class="`cb-row__nav--${arrowsAt}`">
      <button v-if="showPrev" type="button" class="cb-row__arrow cb-row__arrow--prev" :aria-label="t('Previous')" @click="go(-1)">
        <svg viewBox="8.59 6 7.41 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="currentColor" d="M14.59 6L16 7.41 11.42 12l4.58 4.59L14.59 18 8.59 12z"/>
        </svg>
      </button>
      <div v-if="d.dots && pages > 1" class="cb-row__dots cb-row__dots--inline">
        <button
            v-for="p in pages"
            :key="p"
            type="button"
            class="cb-row__dot"
            :class="{ 'is-active': p - 1 === page }"
            :aria-label="t('Go to slide {n}', { n: p })"
            :aria-current="p - 1 === page ? 'true' : undefined"
            @click="goTo(p - 1)"
        />
      </div>
      <button v-if="showNext" type="button" class="cb-row__arrow cb-row__arrow--next" :aria-label="t('Next')" @click="go(1)">
        <svg viewBox="8.59 6 7.41 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    </div>

    <!-- Custom position (Style → Previous Arrow / Next Arrow): each arrow on its own. -->
    <template v-if="showArrows && arrowsAt === 'custom'">
      <button v-if="showPrev" type="button" class="cb-row__arrow cb-row__arrow--prev cb-pos" :style="prevPos" :aria-label="t('Previous')" @click="go(-1)">
        <svg viewBox="8.59 6 7.41 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="currentColor" d="M14.59 6L16 7.41 11.42 12l4.58 4.59L14.59 18 8.59 12z"/>
        </svg>
      </button>
      <button v-if="showNext" type="button" class="cb-row__arrow cb-row__arrow--next cb-pos" :style="nextPos" :aria-label="t('Next')" @click="go(1)">
        <svg viewBox="8.59 6 7.41 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    </template>

    <div v-if="d.dots && pages > 1 && !dotsInNav" class="cb-row__dots" :class="{ 'cb-row__dots--custom cb-pos': dotsCustom }" :style="dotsCustom ? dotsPos : undefined">
      <button
          v-for="p in pages"
          :key="p"
          type="button"
          class="cb-row__dot"
          :class="{ 'is-active': p - 1 === page }"
          :aria-label="t('Go to slide {n}', { n: p })"
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
import LoopCard from '../loops/LoopCard.vue'
import ProductTags from '../sections/ProductTags.vue'
import productsStore from 'src/stores/products'
import { useBlockQuery } from 'src/composables/useBlockQuery.js'
import { usePriorityBlock } from 'src/composables/usePriorityBlock.js'
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { asResponsive, setResponsiveVar, toCssLength, DEVICES } from 'src/composables/useSectionStyle.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { srcsetOf, LAZY_SIZES, vFitSizes } from 'src/utils/responsive-image.js'
import { useI18n } from 'src/i18n/index.js'

const { t } = useI18n()

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
  // Products found by the block using this carousel (Related Products): shown as they are, no query.
  products: { type: Array, default: null },
})

const d = computed(() => props.data.data || {})
// Slide texts: the color is each slide's own; the title size is this block's --cb-title.
const titleText = computed(() => textStyle(d.value, tsKeys('title', { size: null, color: null }), 'headings'))
const slideText = computed(() => textStyle(d.value, tsKeys('text', { color: null })))
const buttonText = computed(() => textStyle(d.value, tsKeys('button', { size: 'button_text_size', color: null }), 'buttons'))
const source = computed(() => (props.products ? 'products' : d.value.source || 'slides'))
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

// The page's first image (src/utils/priority-image.js): before, every carousel's first slide was high priority.
const picked = usePriorityBlock(props.blockId)

const slides = computed(() => (d.value.slides || [])
    .map((s) => ({ ...s, src: imgUrl(s.image), srcset: srcsetOf(s.image), mobileSrc: imgUrl(s.mobile_image), width: s.image?.width, height: s.image?.height }))
    .filter((s) => s.src))

const queryKey = () => JSON.stringify([
  source.value, d.value.query_type, d.value.category_ids, d.value.tag_ids, d.value.product_ids,
  d.value.limit, d.value.hide_out_of_stock, d.value.slide_category_ids,
])
const { data: fetched } = useBlockQuery(props.blockId, queryKey, (ssrContext) => {
  if (props.products) return Promise.resolve(null)
  if (source.value === 'products') return productsStore.queryProducts(d.value, ssrContext)
  if (source.value === 'categories') return productsStore.queryCategories(d.value.slide_category_ids || [], ssrContext)
  return Promise.resolve([])
})

const items = computed(() => {
  if (source.value === 'images' || source.value === 'logos') {
    return (d.value.images || [])
        .map((img, i) => ({ ...img, key: i, src: imgUrl(img.image), srcset: srcsetOf(img.image), width: img.image?.width, height: img.image?.height }))
        .filter((img) => img.src)
  }
  if (props.products) return props.products
  if (source.value === 'products' || source.value === 'categories') return fetched.value || []
  return []
})

// A card design chosen for the products / categories (Store builder → Card designs), published with it.
const card = computed(() => (Array.isArray(d.value.card) && d.value.card.length ? d.value.card : null))

/* ---------- Row look: Carousel Style, arrows ---------- */

const ROW_STYLES = new Set(['whole', 'peek', 'center'])
const ARROWS_AT = new Set(['sides', 'top_end', 'bottom_end', 'bottom_center', 'custom'])
const ARROW_LOOKS = new Set(['plain', 'outline', 'filled', 'square'])
const SHORT = { desktop: 'd', tablet: 't', mobile: 'm' }
const arrowsAt = computed(() => (ARROWS_AT.has(d.value.arrows_position) ? d.value.arrows_position : 'sides'))
const arrowLook = computed(() => (ARROW_LOOKS.has(d.value.arrow_style) ? d.value.arrow_style : 'plain'))
const showArrows = computed(() => !!d.value.arrows && pages.value > 1)
// "Arrows to Show": both, or only one of them.
const arrowsShow = computed(() => (d.value.arrows_show === 'next' || d.value.arrows_show === 'prev' ? d.value.arrows_show : 'both'))
const showPrev = computed(() => arrowsShow.value !== 'next')
const showNext = computed(() => arrowsShow.value !== 'prev')
const dotsCustom = computed(() => d.value.dots_position === 'custom')
// Below the row, the dots sit in the arrows' row (unless they have a place of their own).
const dotsInNav = computed(() => showArrows.value && !dotsCustom.value && (arrowsAt.value === 'bottom_end' || arrowsAt.value === 'bottom_center'))

// A custom position, per screen size: from the top / middle / bottom and the left / middle /
// right of the block (as seen on the screen), moved by the distances. CSS: .cb-pos.
const POS_Y = new Set(['top', 'middle', 'bottom'])
const POS_X = new Set(['left', 'center', 'right'])
const VAR_SUFFIX = { desktop: '', tablet: '-t', mobile: '-m' }
function customPos(prefix, defY, defX) {
  const fromY = asResponsive(d.value[`${prefix}_from_y`] || defY)
  const fromX = asResponsive(d.value[`${prefix}_from_x`] || defX)
  const dy = asResponsive(d.value[`${prefix}_y`] ?? '')
  const dx = asResponsive(d.value[`${prefix}_x`] ?? '')
  const vars = {}
  for (const device of DEVICES) {
    const sfx = VAR_SUFFIX[device]
    const y = POS_Y.has(fromY[device]) ? fromY[device] : defY
    const x = POS_X.has(fromX[device]) ? fromX[device] : defX
    const oy = toCssLength(dy[device]) || '0px'
    const ox = toCssLength(dx[device]) || '0px'
    vars[`--p-top${sfx}`] = y === 'top' ? oy : (y === 'middle' ? `calc(50% + ${oy})` : 'auto')
    vars[`--p-bottom${sfx}`] = y === 'bottom' ? oy : 'auto'
    vars[`--p-ty${sfx}`] = y === 'middle' ? '-50%' : '0px'
    vars[`--p-left${sfx}`] = x === 'left' ? ox : (x === 'center' ? `calc(50% + ${ox})` : 'auto')
    vars[`--p-right${sfx}`] = x === 'right' ? ox : 'auto'
    vars[`--p-tx${sfx}`] = x === 'center' ? '-50%' : '0px'
  }
  return vars
}
const prevPos = computed(() => customPos('prev', 'middle', 'left'))
const nextPos = computed(() => customPos('next', 'middle', 'right'))
const dotsPos = computed(() => customPos('dots', 'bottom', 'center'))
const rowClasses = computed(() => {
  const styles = asResponsive(d.value.row_style || 'whole')
  const cls = {
    [`cb-row--${source.value}`]: true,
    'cb-row--arrows': showArrows.value && arrowsAt.value === 'sides',
    [`cb-arrows--${arrowLook.value}`]: true,
    'cb-arrows--own-hover': !!(d.value.arrow_hover_bg || d.value.arrow_hover_color),
    'cb-noarrows-m': d.value.arrows_mobile === false,
    'cb-bleed-m': !!d.value.bleed_mobile,
  }
  for (const device of DEVICES) cls[`cb-st-${ROW_STYLES.has(styles[device]) ? styles[device] : 'whole'}-${SHORT[device]}`] = true
  return cls
})

const ariaLabel = computed(() => t({ images: 'Image carousel', logos: 'Brands', products: 'Products', categories: 'Categories' }[source.value] || 'Carousel'))

/* ---------- Autoplay (paused on hover/focus/touch and for reduced motion) ---------- */

const paused = ref(false)
const reducedMotion = ref(false)
const autoplayMs = computed(() => (d.value.autoplay && !reducedMotion.value ? Math.max(2, Number(d.value.autoplay_seconds) || 5) * 1000 : 0))
const heroAutoplay = computed(() => (paused.value ? false : autoplayMs.value || false))
const slideIndex = ref(0)
const fade = computed(() => d.value.slide_transition === 'fade')
const pad = (n) => String(n).padStart(2, '0')
// Without autoplay the line shows how far along the slides are.
const barStyle = computed(() => (heroAutoplay.value
  ? { animationDuration: `${autoplayMs.value}ms` }
  : { transform: `scaleX(${(slideIndex.value + 1) / Math.max(1, slides.value.length)})` }))

/* ---------- Scroll-snap row ---------- */

const trackRef = ref(null)
const pages = ref(1)
const page = ref(0)
let resizeObserver = null
let timer = null

// The distance one arrow press moves: the items wholly in view.
function stepOf(el) {
  const first = el.children[0]
  if (!first) return el.clientWidth
  const cs = getComputedStyle(el)
  const gap = parseFloat(cs.columnGap) || 0
  const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)
  const itemW = first.getBoundingClientRect().width + gap
  const whole = Math.max(1, Math.floor((el.clientWidth - pad + gap + 1) / itemW))
  return whole * itemW
}

function measure() {
  const el = trackRef.value
  if (!el) return
  const max = el.scrollWidth - el.clientWidth
  pages.value = max > 4 ? Math.ceil((max - 4) / stepOf(el)) + 1 : 1
  onScroll()
}

// Right-to-left pages (Hebrew) scroll the other way: scrollLeft goes from 0 down.
const rtl = (el) => getComputedStyle(el).direction === 'rtl'

function onScroll() {
  const el = trackRef.value
  if (!el) return
  const left = Math.abs(el.scrollLeft)
  const atEnd = left + el.clientWidth >= el.scrollWidth - 4
  page.value = atEnd ? pages.value - 1 : Math.round(left / stepOf(el))
}

function goTo(p) {
  const el = trackRef.value
  if (!el) return
  const left = Math.min(p * stepOf(el), el.scrollWidth - el.clientWidth)
  el.scrollTo({ left: (rtl(el) ? -1 : 1) * left, behavior: reducedMotion.value ? 'auto' : 'smooth' })
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
  const arrowSize = toCssLength(d.value.arrow_size)
  if (arrowSize) vars['--cb-arrow'] = arrowSize
  const arrowColors = {
    arrow_color: '--cb-arrow-c',
    arrow_bg: '--cb-arrow-bg',
    arrow_border_color: '--cb-arrow-bc',
    arrow_hover_color: '--cb-arrow-hc',
    arrow_hover_bg: '--cb-arrow-hbg',
    arrow_hover_border_color: '--cb-arrow-hbc',
  }
  for (const [key, name] of Object.entries(arrowColors)) {
    const color = resolveGlobalColor(d.value[key])
    if (color) vars[name] = color
  }
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
.cb-hero :deep(.q-carousel__navigation .q-btn) { color: var(--cb-control, #fff); }
.cb-hero :deep(.q-carousel__arrow .q-btn) { color: var(--cb-arrow-c, var(--cb-control, #fff)); }
/* "Arrows to Show": one of them. */
.cb-only-next :deep(.q-carousel__prev-arrow),
.cb-only-prev :deep(.q-carousel__next-arrow) { display: none; }

/* Slow zoom: the shown slide's photo grows a little while it's on screen. */
.cb-zoom :deep(.q-carousel__slide) .cb-slide__media img { animation: cb-zoom 9s ease-out forwards; }
@keyframes cb-zoom {
  from { transform: scale(1); }
  to { transform: scale(1.08); }
}

/* Counter + progress line, bottom corner on the end side. */
.carousel-block { position: relative; }
.cb-counter {
  position: absolute;
  inset-inline-end: 24px;
  bottom: 20px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
  color: var(--cb-control, #fff);
  pointer-events: none;
}
.cb-counter__bar {
  position: relative;
  width: 72px;
  height: 1px;
  overflow: hidden;
  background: color-mix(in srgb, currentColor 40%, transparent);
}
.cb-counter__bar i {
  position: absolute;
  inset: 0;
  background: currentColor;
  transform-origin: left center;
  transform: scaleX(0);
  transition: transform 0.4s ease;
}
[dir="rtl"] .cb-counter__bar i { transform-origin: right center; }
.cb-counter__bar i.is-running { animation: cb-progress linear forwards; transition: none; }
@keyframes cb-progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
@media (max-width: 767px) {
  .cb-counter { inset-inline-end: 16px; bottom: 14px; }
}

/* ---------- Multi-item row ---------- */
.cb-row { position: relative; }
/* A size container: the centred style measures the row with cqw. */
.cb-row__viewport { position: relative; container-type: inline-size; }
.cb-row__track {
  --cb-gap-now: var(--cb-gap, 16px);
  --cb-n: var(--cb-per, 4);
  --cb-col: calc((100% - (var(--cb-n) - 1) * var(--cb-gap-now)) / var(--cb-n));
  --cb-pad: 0px;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: var(--cb-col);
  gap: var(--cb-gap-now);
  padding-inline: var(--cb-pad);
  scroll-padding-inline: var(--cb-pad);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}
.cb-row__track::-webkit-scrollbar { display: none; }
.cb-row__track:focus-visible { outline: 2px solid var(--cb-control, currentColor); outline-offset: 4px; }
.cb-row__item { scroll-snap-align: start; min-width: 0; }

/* Carousel Style, per screen size: whole items (above), half of the next one,
   or centred with a quarter of an item at each side. */
@media (min-width: 1024px) {
  .cb-st-peek-d .cb-row__track { --cb-col: calc((100% - var(--cb-n) * var(--cb-gap-now)) / (var(--cb-n) + 0.5)); }
  .cb-st-center-d .cb-row__track { --cb-col: calc((100cqw - (var(--cb-n) + 1) * var(--cb-gap-now)) / (var(--cb-n) + 0.5)); --cb-pad: calc(var(--cb-col) * 0.25 + var(--cb-gap-now)); }
}

/* Arrows in a gutter at each side, like the related products carousel. */
.cb-row--arrows .cb-row__viewport { padding: 0 20px; }
.cb-row__arrow {
  z-index: 2;
  width: var(--cb-arrow, 23px);
  height: var(--cb-arrow, auto);
  padding: 4px;
  border: 0;
  border-radius: 4px;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: var(--cb-arrow-bg, transparent);
  color: var(--cb-arrow-c, var(--cb-control, var(--q-secondary)));
  transition: background 0.2s, color 0.2s, border-color 0.2s, opacity 0.2s;
}
.cb-row__arrow svg { display: block; width: 100%; height: auto; max-height: 100%; }
[dir="rtl"] .cb-row__arrow svg { transform: scaleX(-1); }
.cb-row__arrow--side { position: absolute; top: 38%; transform: translateY(-50%); }
.cb-row__arrow--side.cb-row__arrow--prev { left: 0; }
.cb-row__arrow--side.cb-row__arrow--next { right: 0; }
.cb-row__arrow:hover { background: var(--cb-arrow-hbg, var(--cb-arrow-bg, rgba(0, 0, 0, 0.05))); color: var(--cb-arrow-hc, var(--cb-arrow-c, var(--cb-control, var(--q-secondary)))); }

/* Arrow Look: round or square buttons hold a smaller chevron. */
.cb-arrows--outline .cb-row__arrow,
.cb-arrows--filled .cb-row__arrow,
.cb-arrows--square .cb-row__arrow { width: var(--cb-arrow, 40px); height: var(--cb-arrow, 40px); padding: calc(var(--cb-arrow, 40px) * 0.32); }
.cb-arrows--outline .cb-row__arrow { border: 1px solid var(--cb-arrow-bc, currentColor); border-radius: 50%; }
.cb-arrows--square .cb-row__arrow { border: 1px solid var(--cb-arrow-bc, currentColor); border-radius: 0; }
.cb-arrows--filled .cb-row__arrow { border-radius: 50%; background: var(--cb-arrow-bg, var(--cb-control, var(--q-secondary))); color: var(--cb-arrow-c, #fff); }
.cb-arrows--outline .cb-row__arrow:hover,
.cb-arrows--square .cb-row__arrow:hover {
  background: var(--cb-arrow-hbg, var(--cb-control, var(--q-secondary)));
  border-color: var(--cb-arrow-hbc, var(--cb-arrow-hbg, var(--cb-control, var(--q-secondary))));
  color: var(--cb-arrow-hc, #fff);
}
.cb-arrows--filled .cb-row__arrow:hover {
  background: var(--cb-arrow-hbg, var(--cb-arrow-bg, var(--cb-control, var(--q-secondary))));
  color: var(--cb-arrow-hc, var(--cb-arrow-c, #fff));
}
/* No own hover colours: the filled arrow just fades a little. */
.cb-arrows--filled:not(.cb-arrows--own-hover) .cb-row__arrow:hover { opacity: 0.85; }
.cb-arrows--outline.cb-row--arrows .cb-row__viewport,
.cb-arrows--filled.cb-row--arrows .cb-row__viewport,
.cb-arrows--square.cb-row--arrows .cb-row__viewport { padding: 0 calc(var(--cb-arrow, 40px) + 8px); }

/* Arrows together, above or below the row. */
.cb-row__nav { display: flex; align-items: center; gap: 8px; }
.cb-row__nav--top { justify-content: flex-end; margin-bottom: 16px; }
.cb-row__nav--bottom_end { justify-content: flex-end; margin-top: 16px; }
.cb-row__nav--bottom_center { justify-content: center; margin-top: 16px; }
/* At the end: the dots take the start, the arrows the end. */
.cb-row__nav--bottom_end .cb-row__dots--inline { order: -1; margin: 0 auto 0 0; }
[dir="rtl"] .cb-row__nav--bottom_end .cb-row__dots--inline { margin: 0 0 0 auto; }
.cb-row__dots--inline { margin: 0 8px; }
.cb-row__arrow:focus-visible { outline: 2px solid var(--cb-control, var(--q-secondary)); outline-offset: 2px; }

.cb-row__dots { display: flex; justify-content: center; gap: 8px; margin-top: 16px; }
.cb-row__dots.cb-row__dots--inline { margin-top: 0; }

/* Custom position (arrows and dots), on the block as seen on the screen in every language. */
/* rtl:begin:ignore */
.cb-pos {
  position: absolute;
  z-index: 3;
  margin: 0;
  top: var(--p-top);
  bottom: var(--p-bottom);
  left: var(--p-left);
  right: var(--p-right);
  transform: translate(var(--p-tx), var(--p-ty));
}
@media (min-width: 768px) and (max-width: 1023px) {
  .cb-pos { top: var(--p-top-t, var(--p-top)); bottom: var(--p-bottom-t, var(--p-bottom)); left: var(--p-left-t, var(--p-left)); right: var(--p-right-t, var(--p-right)); transform: translate(var(--p-tx-t, var(--p-tx)), var(--p-ty-t, var(--p-ty))); }
}
@media (max-width: 767px) {
  .cb-pos { top: var(--p-top-m, var(--p-top-t, var(--p-top))); bottom: var(--p-bottom-m, var(--p-bottom-t, var(--p-bottom))); left: var(--p-left-m, var(--p-left-t, var(--p-left))); right: var(--p-right-m, var(--p-right-t, var(--p-right))); transform: translate(var(--p-tx-m, var(--p-tx-t, var(--p-tx))), var(--p-ty-m, var(--p-ty-t, var(--p-ty)))); }
}
/* rtl:end:ignore */
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
  .cb-hero :deep(.q-carousel__slide.cb-slide) { height: var(--cb-h-t, var(--cb-h, 440px)); }
  .cb-slide__title { font-size: var(--cb-title-t, var(--cb-title, 2.4rem)); }
  .cb-row__track { --cb-gap-now: var(--cb-gap-t, var(--cb-gap, 16px)); --cb-n: var(--cb-per-t, var(--cb-per, 3)); }
  .cb-img img { height: var(--cb-img-h-t, var(--cb-img-h, auto)); }
  .cb-row--logos .cb-img img { height: var(--cb-img-h-t, var(--cb-img-h, 60px)); }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .cb-st-peek-t .cb-row__track { --cb-col: calc((100% - var(--cb-n) * var(--cb-gap-now)) / (var(--cb-n) + 0.5)); }
  .cb-st-center-t .cb-row__track { --cb-col: calc((100cqw - (var(--cb-n) + 1) * var(--cb-gap-now)) / (var(--cb-n) + 0.5)); --cb-pad: calc(var(--cb-col) * 0.25 + var(--cb-gap-now)); }
}
@media (max-width: 767px) {
  .cb-hero :deep(.q-carousel__slide.cb-slide) { height: var(--cb-h-m, var(--cb-h-t, var(--cb-h, 380px))); }
  .cb-slide__content { padding: 32px 24px 48px; }
  .cb-slide__title { font-size: var(--cb-title-m, var(--cb-title-t, var(--cb-title, 1.9rem))); }
  .cb-slide__text { font-size: 1rem; }
  .cb-row__track { --cb-gap-now: var(--cb-gap-m, var(--cb-gap-t, var(--cb-gap, 12px))); --cb-n: var(--cb-per-m, var(--cb-per-t, var(--cb-per, 2))); }
  .cb-st-peek-m .cb-row__track { --cb-col: calc((100% - var(--cb-n) * var(--cb-gap-now)) / (var(--cb-n) + 0.5)); }
  .cb-st-center-m .cb-row__track { --cb-col: calc((100cqw - (var(--cb-n) + 1) * var(--cb-gap-now)) / (var(--cb-n) + 0.5)); --cb-pad: calc(var(--cb-col) * 0.25 + var(--cb-gap-now)); }
  /* "Show arrows on phones" off: people swipe. */
  .cb-noarrows-m .cb-row__arrow { display: none; }
  .cb-noarrows-m.cb-row--arrows .cb-row__viewport { padding: 0; }
  /* "Run to the screen edge on phones": the row reaches both edges, its first item stays in line. */
  .cb-bleed-m .cb-row__viewport { padding-inline: 0; }
  .cb-bleed-m .cb-row__track {
    margin-inline: calc(50cqw - 50vw);
    padding-inline: calc(50vw - 50cqw + var(--cb-pad));
    scroll-padding-inline: calc(50vw - 50cqw + var(--cb-pad));
  }
  .cb-img img { height: var(--cb-img-h-m, var(--cb-img-h-t, var(--cb-img-h, auto))); }
  .cb-row--logos .cb-img img { height: var(--cb-img-h-m, var(--cb-img-h-t, var(--cb-img-h, 48px))); }
}
</style>
