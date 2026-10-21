<template>
  <div v-if="ctx && image" class="lt-img" :class="classes" :style="vars">
    <img
        class="lt-img__img"
        :src="image.src"
        :srcset="image.srcset || undefined"
        :sizes="image.srcset ? sizes : undefined"
        v-fit-sizes
        :alt="image.alt || ''"
        :width="image.width || undefined"
        :height="image.height || undefined"
        :loading="ctx.priority ? 'eager' : 'lazy'"
        :fetchpriority="ctx.priority ? 'high' : undefined"
        decoding="async"
    />
    <img
        v-if="hover === 'swap' && image.second"
        class="lt-img__img lt-img__second"
        :src="image.second"
        :srcset="image.secondSrcset || undefined"
        :sizes="image.secondSrcset ? sizes : undefined"
        v-fit-sizes
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
    />
    <span v-if="shade" class="lt-img__shade" :class="`lt-img__shade--${shade}`" aria-hidden="true" />
    <template v-if="isProduct">
      <span v-if="d.show_badge !== false && badge" class="lt-img__badge" :class="`lt-img__badge--${badgePosition}`">{{ badge === 'sold' ? t('Sold out') : t('Sale!') }}</span>
      <q-btn
          v-if="d.show_wishlist"
          class="lt-img__heart"
          flat
          round
          dense
          :icon="wished ? matFavorite : matFavoriteBorder"
          :aria-label="wished ? t('Remove from wishlist') : t('Add to wishlist')"
          :loading="wishlist.isLoading(ctx.item.id)"
          @click.prevent.stop="toggleWish"
      />
    </template>
  </div>
</template>

<script setup>
/**
 * A card's image (lp_image, lc_image, lpo_image): its shape per screen size
 * (a ratio, a fixed height, or filling the card), shown in the card or
 * behind the whole card, a shade for text over it, and what happens when
 * the mouse is over the card. Products add their Sale / Sold out label and
 * the wishlist heart. Styles: LoopCard.vue.
 */
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { matFavorite, matFavoriteBorder } from '@quasar/extras/material-icons'
import wishlist from 'src/stores/wishlist.js'
import { useLoopItem, loopImage } from './loop-item.js'
import { asResponsive, toCssLength, DEVICES } from 'src/composables/useSectionStyle.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { vFitSizes, croppedSizes, ratioFromSrcset } from 'src/utils/responsive-image.js'

// WordPress's own `sizes` says the full screen width: a card is a column of a grid.
const CARD_COLS = { desktop: 25, tablet: 33, mobile: 50 }

const props = defineProps({
  data: { type: Object, required: true },
})
const $q = useQuasar()
const loop = useLoopItem()
const ctx = computed(() => loop?.value || null)
const d = computed(() => props.data.data || {})
const isProduct = computed(() => ctx.value?.type === 'product')
const image = computed(() => (ctx.value ? loopImage(ctx.value.type, ctx.value.item) : null))

const RATIOS = new Set(['1/1', '4/5', '3/4', '2/3', '4/3', '3/2', '16/9'])
const SHORT = { desktop: 'd', tablet: 't', mobile: 'm' }
const SUFFIX = { desktop: '', tablet: '-t', mobile: '-m' }
const HOVERS = new Set(['zoom', 'darken', 'swap'])
const SHADES = new Set(['full', 'bottom', 'top'])
const BADGE_SPOTS = new Set(['top-start', 'top-end', 'bottom-start', 'bottom-end'])

const background = computed(() => d.value.display === 'background')
const hover = computed(() => (HOVERS.has(d.value.hover_effect) ? d.value.hover_effect : ''))
const shade = computed(() => (SHADES.has(d.value.overlay_style) ? (d.value.overlay_style === 'full' ? 'full' : d.value.overlay_style) : ''))
const badgePosition = computed(() => (BADGE_SPOTS.has(d.value.badge_position) ? d.value.badge_position : 'top-start'))
const badge = computed(() => {
  const p = ctx.value?.item
  if (!p || !isProduct.value) return ''
  if (p.is_in_stock === false) return 'sold'
  return p.on_sale ? 'sale' : ''
})

// The card's photo box per screen size, so a cropped photo loads a file wide enough at once.
const sizes = computed(() => {
  const box = {}
  if (!background.value) {
    const ratio = asResponsive(d.value.aspect_ratio || '1/1')
    const height = asResponsive(d.value.image_height)
    for (const device of DEVICES) {
      const h = toCssLength(height[device])
      if (h) box[device] = { height: h }
      else if (RATIOS.has(ratio[device])) { const [a, b] = ratio[device].split('/').map(Number); box[device] = { ratio: a / b } }
    }
  }
  return croppedSizes(CARD_COLS, box, ratioFromSrcset(image.value?.srcset))
})

const classes = computed(() => {
  const c = { 'lt-img--bg': background.value, [`lt-img--${hover.value}`]: !!hover.value }
  if (background.value) return c
  const ratio = asResponsive(d.value.aspect_ratio || '1/1')
  const height = asResponsive(d.value.image_height)
  let sized = 0
  for (const device of DEVICES) {
    const s = SHORT[device]
    if (toCssLength(height[device])) c[`lt-h-${s}`] = true
    else if (ratio[device] === 'fill') c[`lt-f-${s}`] = true
    else if (RATIOS.has(ratio[device])) c[`lt-r-${s}`] = true
    else continue
    sized++
  }
  // Every screen size has a box of its own: the photo fills it.
  c['lt-sized'] = sized === DEVICES.length
  return c
})

const vars = computed(() => {
  const v = {}
  const ratio = asResponsive(d.value.aspect_ratio || '1/1')
  const height = asResponsive(d.value.image_height)
  const radius = asResponsive(d.value.image_radius)
  for (const device of DEVICES) {
    if (RATIOS.has(ratio[device])) v[`--lt-ratio${SUFFIX[device]}`] = ratio[device].replace('/', ' / ')
    const h = toCssLength(height[device])
    if (h) v[`--lt-h${SUFFIX[device]}`] = h
  }
  const r = toCssLength(radius.desktop)
  if (r) v['--lt-radius'] = r
  const bw = toCssLength(d.value.image_border)
  if (bw) v['--lt-bw'] = bw
  const bc = resolveGlobalColor(d.value.image_border_color)
  if (bc) v['--lt-bc'] = bc
  if (d.value.object_fit === 'contain') v['--lt-fit'] = 'contain'
  if (shade.value) {
    const color = resolveGlobalColor(d.value.overlay_color)
    if (color) v['--lt-shade'] = color
    const o = Number(d.value.overlay_opacity)
    v['--lt-shade-o'] = String(Number.isFinite(o) ? Math.max(0, Math.min(100, o)) / 100 : 0.4)
  }
  return v
})

const wished = computed(() => {
  const id = ctx.value?.item?.id
  return !!(id && wishlist.state.items && Object.values(wishlist.state.items).some((o) => o.id === id))
})
async function toggleWish() {
  await wishlist.toggleWishlistItem(ctx.value.item.id, $q)
}
</script>
