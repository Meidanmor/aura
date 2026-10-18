<template>
  <div v-if="ready && placed.length" ref="layer" class="ptags-layer" dir="ltr">
    <div
        v-for="tag in placed"
        :key="tag.key"
        class="ptag"
        :class="{ 'is-open': openKey === tag.key, 'ptag--flip': tag.flip }"
        :style="{ left: `${tag.left}px`, top: `${tag.top}px` }"
        @mouseenter="hoverOpen(tag.key)"
        @mouseleave="hoverClose(tag.key)"
    >
      <button
          type="button"
          class="ptag__dot"
          :aria-label="tag.product ? t('Show {name}', { name: tag.product.name }) : t('Show product')"
          :aria-expanded="openKey === tag.key ? 'true' : 'false'"
          @click.stop="toggle(tag.key)"
      ><span class="ptag__pulse" aria-hidden="true" /></button>
      <router-link
          v-if="tag.product"
          class="ptag__label"
          :to="`/product/${tag.product.slug}`"
          :tabindex="openKey === tag.key ? 0 : -1"
          dir="auto"
      >
        <span class="ptag__name">{{ tag.product.name }}</span>
        <span v-if="tag.price" class="ptag__price">{{ tag.price }}</span>
        <span class="ptag__arrow" aria-hidden="true">→</span>
      </router-link>
    </div>
  </div>
  <div v-else-if="ready" ref="layer" class="ptags-layer" aria-hidden="true" />
</template>

<script setup>
/**
 * Product tags on an image ("shop the look"): small animated dots placed on
 * products in a photo; a dot opens the product's name and price, which link
 * to the product. Positions are % of the image itself, so they're mapped
 * onto the box the image fills (cropped with object-fit / background-size
 * "cover" by default). Drawn only in the browser (they need the box's size
 * and the products' current prices), so nothing shifts the page.
 */
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import productsStore from 'src/stores/products'
import { formatCurrency } from 'src/utils/formatters.js'
import { useI18n } from 'src/i18n/index.js'

const { t } = useI18n()

const props = defineProps({
  // [{ product, x, y, mx, my }]
  tags: { type: Array, default: () => [] },
  // { url, width, height } of the image as shown on big screens / on phones (null: the same image)
  image: { type: Object, default: null },
  mobileImage: { type: Object, default: null },
  // How the image fills its box: cover | contain | fill | auto, per screen size or one value
  fit: { type: [String, Object], default: 'cover' },
  // Its position in the box ("center center", "30% 70%"…), per screen size or one value
  position: { type: [String, Object], default: 'center center' },
})

// `open`: whether a label is open (a slideshow waits meanwhile).
const emit = defineEmits(['open'])

const ready = ref(false)
const layer = ref(null)
const size = ref({ w: 0, h: 0 })
const device = ref('desktop')
const products = ref({})
const openKey = ref('')

const perDevice = (v) => (v && typeof v === 'object' ? v[device.value] || v.desktop : v)

/** "left top" / "30% 70%" → fractions (0 = start edge, 1 = end edge); px values count as the middle. */
function fractions(pos) {
  const words = String(pos || 'center center').trim().split(/\s+/)
  const named = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 }
  const one = (w) => (w in named ? named[w] : /%$/.test(w) ? Math.min(100, Math.max(0, parseFloat(w))) / 100 : 0.5)
  let [a, b] = [words[0] || 'center', words[1] || 'center']
  // "top left" is written the other way round.
  if (['top', 'bottom'].includes(a) || ['left', 'right'].includes(b)) [a, b] = [b, a]
  return { fx: one(a), fy: one(b) }
}

const placed = computed(() => {
  const { w: cw, h: ch } = size.value
  if (!cw || !ch) return []
  const phone = device.value === 'mobile'
  const img = (phone && props.mobileImage?.url ? props.mobileImage : props.image) || {}
  const iw = Number(img.width) || cw
  const ih = Number(img.height) || ch
  const fit = perDevice(props.fit) || 'cover'
  const { fx, fy } = fractions(perDevice(props.position))
  let sx
  let sy
  if (fit === 'contain') sx = sy = Math.min(cw / iw, ch / ih)
  else if (fit === 'fill') { sx = cw / iw; sy = ch / ih }
  else if (fit === 'auto' || fit === 'none') sx = sy = 1
  else sx = sy = Math.max(cw / iw, ch / ih)
  const dw = iw * sx
  const dh = ih * sy
  const ox = (cw - dw) * fx
  const oy = (ch - dh) * fy
  const out = []
  props.tags.forEach((tag, i) => {
    const usePhone = phone && props.mobileImage?.url && tag.mx !== '' && tag.mx != null
    const x = Number(usePhone ? tag.mx : tag.x)
    const y = Number(usePhone ? tag.my : tag.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    const left = ox + (x / 100) * dw
    const top = oy + (y / 100) * dh
    // Cropped out of view on this screen: no dot.
    if (left < 8 || top < 8 || left > cw - 8 || top > ch - 8) return
    const product = products.value[tag.product] || null
    out.push({ key: `${i}-${tag.product}`, left, top, flip: left > cw * 0.6, product, price: priceOf(product) })
  })
  return out
})

function priceOf(p) {
  const pr = p?.prices
  if (!pr || pr.price === undefined) return ''
  return formatCurrency(pr.price, {
    minorUnit: Number(pr.currency_minor_unit ?? 2),
    decimalSeparator: pr.currency_decimal_separator,
    prefix: pr.currency_prefix ?? '',
    suffix: pr.currency_suffix ?? '',
  })
}

/* ---------- opening ---------- */

let hoverTimer = null
const canHover = () => window.matchMedia?.('(hover: hover)').matches
function toggle(key) { openKey.value = openKey.value === key ? '' : key }
function hoverOpen(key) {
  if (!canHover()) return
  clearTimeout(hoverTimer)
  openKey.value = key
}
function hoverClose(key) {
  if (!canHover()) return
  hoverTimer = setTimeout(() => { if (openKey.value === key) openKey.value = '' }, 250)
}
const onDocClick = (e) => { if (openKey.value && !layer.value?.contains(e.target)) openKey.value = '' }
const onKey = (e) => { if (e.key === 'Escape') openKey.value = '' }

/* ---------- size and products ---------- */

let resizeObs = null
let phoneQuery = null
function measure() {
  const el = layer.value
  if (!el) return
  const r = el.getBoundingClientRect()
  size.value = { w: r.width, h: r.height }
  device.value = phoneQuery?.matches ? 'mobile' : window.matchMedia('(max-width: 1023px)').matches ? 'tablet' : 'desktop'
}

async function loadProducts() {
  const ids = [...new Set(props.tags.map((x) => Number(x.product)).filter(Boolean))]
  if (!ids.length) return
  try {
    const list = await productsStore.queryProducts({ query_type: 'manual', product_ids: ids })
    const map = {}
    for (const p of list || []) map[p.id] = p
    products.value = map
  } catch {
    // No labels without the products; the dots alone aren't worth showing then.
    products.value = {}
  }
}

onMounted(() => {
  ready.value = true
  phoneQuery = window.matchMedia('(max-width: 767px)')
  requestAnimationFrame(() => {
    measure()
    if ('ResizeObserver' in window && layer.value) {
      resizeObs = new ResizeObserver(measure)
      resizeObs.observe(layer.value)
    }
  })
  phoneQuery.addEventListener?.('change', measure)
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
  loadProducts()
})
onUnmounted(() => {
  resizeObs?.disconnect()
  phoneQuery?.removeEventListener?.('change', measure)
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
  clearTimeout(hoverTimer)
})
watch(() => props.tags.map((x) => x.product).join(','), loadProducts)
watch(openKey, (k) => emit('open', !!k))
watch(layer, (el, old) => {
  if (!resizeObs) return
  if (old) resizeObs.unobserve(old)
  if (el) { resizeObs.observe(el); measure() }
})
</script>

<style>
/* Positions here are measured left to right on every page (the layer is dir="ltr"): not flipped for Hebrew. */
/* rtl:begin:ignore */
.ptags-layer {
  position: absolute !important;
  inset: 0;
  z-index: 3 !important;
  pointer-events: none;
}
.ptag {
  position: absolute;
  width: 0;
  height: 0;
}
.ptag__dot {
  position: absolute;
  left: -11px;
  top: -11px;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  pointer-events: auto;
  transition: transform 0.25s ease;
}
.ptag__dot::after {
  content: '';
  position: absolute;
  inset: 7px;
  border-radius: 50%;
  background: #1a1a1a;
  transition: transform 0.25s ease;
}
.ptag__pulse {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.9);
  animation: ptag-pulse 2.2s ease-out infinite;
}
.ptag:hover .ptag__dot,
.ptag.is-open .ptag__dot { transform: scale(1.12); }
.ptag.is-open .ptag__dot::after { transform: scale(0.6); }
.ptag__dot:focus-visible { outline: 2px solid #fff; outline-offset: 4px; }
@keyframes ptag-pulse {
  0% { transform: scale(0.7); opacity: 0.9; }
  70% { transform: scale(1.5); opacity: 0; }
  100% { transform: scale(1.5); opacity: 0; }
}

.ptag__label {
  position: absolute;
  left: 20px;
  top: 0;
  transform: translate(-6px, -50%);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  background: rgba(255, 255, 255, 0.97);
  color: #1a1a1a;
  border-radius: 2px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.14);
  font-size: 0.8125rem;
  line-height: 1.2;
  white-space: nowrap;
  text-decoration: none;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0s linear 0.2s;
}
.ptag--flip .ptag__label {
  left: auto;
  right: 20px;
  transform: translate(6px, -50%);
}
.ptag.is-open .ptag__label {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translate(0, -50%);
  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0s;
}
.ptag__name { font-weight: 500; }
.ptag__price { opacity: 0.75; }
.ptag__arrow { transition: transform 0.2s ease; }
.ptag__label:hover .ptag__arrow { transform: translateX(3px); }
.ptag__label:hover .ptag__name { text-decoration: underline; }

@media (prefers-reduced-motion: reduce) {
  .ptag__pulse { animation: none; opacity: 0.6; }
  .ptag__label, .ptag__dot, .ptag__dot::after { transition: none; }
}
/* rtl:end:ignore */
</style>
