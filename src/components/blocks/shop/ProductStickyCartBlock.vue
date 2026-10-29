<template>
  <!-- In the page only as a marker (its wrapper takes no room); the bar itself is fixed to the screen. -->
  <span class="sticky-cart-anchor" hidden>
    <Teleport v-if="mounted && buyable" to="body">
      <div
          ref="bar"
          class="sticky-cart"
          :class="[`sticky-cart--${showOn}`, `sticky-cart--${position}`, { 'is-shown': shown, 'has-shadow': d.bar_shadow !== false }]"
          :style="barVars"
          :aria-hidden="shown ? undefined : 'true'"
          :inert="shown ? undefined : true"
      >
        <div class="sticky-cart__inner">
          <img v-if="d.show_image !== false && image" :src="image" alt="" class="sticky-cart__img" width="44" height="44" loading="lazy">
          <div v-if="d.show_name !== false || d.show_price !== false" class="sticky-cart__text">
            <div v-if="d.show_name !== false" class="sticky-cart__name" :class="nameText.class" :style="nameText.style">{{ p.product.name }}</div>
            <!-- eslint-disable-next-line vue/no-v-html -- the product page's sanitized price -->
            <div v-if="d.show_price !== false && price" class="sticky-cart__price" :class="priceText.class" :style="priceText.style" v-html="price" />
          </div>
          <q-btn
              :label="label"
              class="sticky-cart__btn"
              :class="[buttonText.class, paddingCls]"
              :style="[buttonText.style, buttonColors]"
              :color="buttonBg ? undefined : 'secondary'"
              unelevated
              :loading="p.cart.state.loading.cart"
              @click="onClick"
          />
        </div>
      </div>
    </Teleport>
  </span>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { asResponsive, toCssLength } from 'src/composables/useSectionStyle.js'
import { gradientOf } from 'src/utils/gradient.js'
import { zeroPriceButton } from 'src/utils/zero-price.js'
import { isEditorMode } from 'src/utils/config-loader.js'
import { useI18n } from 'src/i18n/index.js'

/**
 * "Floating Add To Cart" (product page template): a bar fixed to the bottom
 * (or top) of the screen once the page's own Add To Cart block is scrolled
 * past. It adds this product with the options chosen on the page; while
 * options are missing it scrolls up to them. Client only (it starts hidden).
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const router = useRouter()
const { t } = useI18n()

const showOn = computed(() => (['tablet', 'all'].includes(d.value.show_on) ? d.value.show_on : 'mobile'))
const position = computed(() => (d.value.position === 'top' ? 'top' : 'bottom'))
// Nothing to buy: out of stock, a draft, or no price (the store's setting).
const buyable = computed(() => {
  const product = p?.product
  return !!(product?.id && product.is_in_stock && product.status !== 'draft' && !zeroPriceButton(product, { onProductPage: true }))
})

const needsChoice = computed(() => p?.isVariable && !p.selectedVariation)
const label = computed(() => (needsChoice.value
    ? d.value.choose_label || t('Choose options')
    : d.value.button_label || t('Add to Cart')))
const price = computed(() => (p?.selectedVariation && !p.variationLoading ? p.safeVariationPrice : p?.safePrice) || '')
const image = computed(() => {
  const img = p?.product?.images?.[0]
  return img?.thumbnail || img?.src || ''
})

async function onClick() {
  if (needsChoice.value) {
    p.showChoices()
    return
  }
  const checkout = d.value.button_action === 'buy_now'
  if ((await p.addCurrentToCart({ checkout })) && checkout) await router.push('/checkout')
}

/* ---------- Look ---------- */
const nameText = computed(() => textStyle(d.value, tsKeys('name')))
const priceText = computed(() => textStyle(d.value, tsKeys('price')))
const buttonText = computed(() => textStyle(d.value, tsKeys('button'), 'buttons'))
const buttonBg = computed(() => resolveGlobalColor(d.value.button_bg))
const buttonColors = computed(() => {
  const bg = gradientOf(d.value.button_bg, d.value.button_bg2, d.value.gradient_angle ?? 90)
  return { ...(bg ? { background: bg } : {}), ...(d.value.button_text ? { color: resolveGlobalColor(d.value.button_text) } : {}) }
})

// Padding per screen size: a side left empty on a smaller screen keeps the bigger screen's.
function sidesVars(value, name) {
  const vars = {}
  const r = asResponsive(value)
  const last = {}
  let any = false
  for (const [device, suffix] of [['desktop', ''], ['tablet', '-t'], ['mobile', '-m']]) {
    const box = r[device] && typeof r[device] === 'object' ? r[device] : {}
    for (const side of ['top', 'right', 'bottom', 'left']) {
      const v = toCssLength(box[side])
      if (v !== null && v !== undefined && v !== '') last[side] = v
    }
    if (!Object.keys(last).length) continue
    any = true
    vars[`${name}${suffix}`] = ['top', 'right', 'bottom', 'left'].map((s) => last[s] ?? `var(${name}-${s}-def)`).join(' ')
  }
  return { vars, any }
}
const barPadding = computed(() => sidesVars(d.value.bar_padding, '--sc-pad'))
const btnPadding = computed(() => sidesVars(d.value.btn_padding, '--sc-bpad'))
const paddingCls = computed(() => (btnPadding.value.any ? 'has-pad' : ''))
const barVars = computed(() => {
  const v = { ...barPadding.value.vars, ...btnPadding.value.vars }
  const bg = resolveGlobalColor(d.value.bar_bg)
  if (bg) v['--sc-bg'] = bg
  const text = resolveGlobalColor(d.value.bar_text)
  if (text) v['--sc-text'] = text
  for (const [key, name] of [['edge_gap', '--sc-gap'], ['bar_radius', '--sc-radius'], ['image_size', '--sc-img'], ['image_radius', '--sc-img-radius'], ['button_radius', '--sc-btn-radius']]) {
    const len = toCssLength(d.value[key])
    if (len) v[name] = len
  }
  return v
})

/* ---------- When it shows ---------- */
const mounted = ref(false)
const shown = ref(false)
const bar = ref(null)
const editor = !import.meta.env.SSR && isEditorMode()
let frame = 0

// Shown once every visible Add To Cart block is above the screen (or, with
// none on the page, after most of a screen of scrolling). In the Store
// builder preview it always shows, so the owner can style it.
function check() {
  frame = 0
  if (editor) {
    shown.value = true
  } else {
    const blocks = [...document.querySelectorAll('.product-buy')].filter((el) => el.getClientRects().length)
    shown.value = blocks.length
      ? blocks.every((el) => el.getBoundingClientRect().bottom < 0)
      : window.scrollY > window.innerHeight * 0.6
  }
  pad()
}
const schedule = () => { if (!frame) frame = requestAnimationFrame(check) }

// A bar at the bottom keeps the page's last lines reachable: the body gets its height as padding.
let padded = false
function pad() {
  const el = bar.value
  const h = shown.value && position.value === 'bottom' && el && getComputedStyle(el).display !== 'none' ? el.offsetHeight : 0
  if (h) {
    document.body.style.paddingBottom = `${h}px`
    padded = true
  } else if (padded) {
    document.body.style.paddingBottom = ''
    padded = false
  }
}

onMounted(() => {
  mounted.value = true
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  nextTick(schedule)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  if (frame) cancelAnimationFrame(frame)
  shown.value = false
  pad()
})
// Another product (the template stays mounted), or the bar appearing / changing size.
watch(() => p?.product?.id, () => { shown.value = false; nextTick(schedule) })
watch([buyable, position, showOn, () => d.value.bar_padding], () => nextTick(schedule))
</script>

<style>
/* The block's wrapper takes no room: the bar lives at the screen's edge. */
.sb-block:has(> .sticky-cart-anchor) { display: contents; }

.sticky-cart {
  --sc-pad-top-def: 10px; --sc-pad-right-def: 16px; --sc-pad-bottom-def: 10px; --sc-pad-left-def: 16px;
  --sc-bpad-top-def: 10px; --sc-bpad-right-def: 20px; --sc-bpad-bottom-def: 10px; --sc-bpad-left-def: 20px;
  position: fixed;
  left: var(--sc-gap, 0px);
  right: var(--sc-gap, 0px);
  z-index: 1500;
  display: none;
  background: var(--sc-bg, var(--q-primary, #fff));
  color: var(--sc-text, inherit);
  border-radius: var(--sc-radius, 0);
  padding: var(--sc-pad, 10px 16px);
  transition: transform .25s ease, opacity .25s ease;
  opacity: 0;
  pointer-events: none;
}
.sticky-cart--bottom { bottom: var(--sc-gap, 0px); transform: translateY(calc(100% + var(--sc-gap, 0px))); }
.sticky-cart--top { top: calc(var(--qwoo-header-stuck, 0px) + var(--sc-gap, 0px)); transform: translateY(-20px); }
.sticky-cart.is-shown { transform: none; opacity: 1; pointer-events: auto; }
.sticky-cart.has-shadow { box-shadow: 0 -2px 16px rgba(0, 0, 0, .12); }
.sticky-cart--top.has-shadow { box-shadow: 0 4px 16px rgba(0, 0, 0, .12); }

@media (max-width: 767px) { .sticky-cart { display: block; padding: var(--sc-pad-m, var(--sc-pad-t, var(--sc-pad, 10px 16px))); } }
@media (min-width: 768px) and (max-width: 1023px) { .sticky-cart--tablet, .sticky-cart--all { display: block; padding: var(--sc-pad-t, var(--sc-pad, 10px 16px)); } }
@media (min-width: 1024px) { .sticky-cart--all { display: block; } }
@media (prefers-reduced-motion: reduce) { .sticky-cart { transition: none; } }

.sticky-cart__inner { display: flex; align-items: center; gap: 12px; max-width: 1200px; margin-inline: auto; }
.sticky-cart__img { width: var(--sc-img, 44px); height: var(--sc-img, 44px); object-fit: cover; border-radius: var(--sc-img-radius, 6px); flex: none; }
.sticky-cart__text { flex: 1 1 auto; min-width: 0; line-height: 1.3; }
.sticky-cart__name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sticky-cart__price { font-size: .9em; }
.sticky-cart__price del { opacity: .6; margin-inline-end: 6px; }
.sticky-cart__btn { flex: none; margin-inline-start: auto; border-radius: var(--sc-btn-radius, 4px); }
.sticky-cart__btn.has-pad { padding: var(--sc-bpad, 10px 20px); }
@media (min-width: 768px) and (max-width: 1023px) { .sticky-cart__btn.has-pad { padding: var(--sc-bpad-t, var(--sc-bpad, 10px 20px)); } }
@media (max-width: 767px) { .sticky-cart__btn.has-pad { padding: var(--sc-bpad-m, var(--sc-bpad-t, var(--sc-bpad, 10px 20px))); } }
</style>
