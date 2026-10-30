<template>
  <div class="lt-card" :class="[`lt-card--${type}`, shape.classes]" :style="shape.vars">
    <SectionTemplate v-for="s in linked" :key="s.id" :data="s" page="loop" nested />
  </div>
</template>

<script setup>
/**
 * One card drawn from a card design (Store builder → Card designs): the
 * design's sections, published into the block that uses it as `card`, with
 * this card's item provided to its blocks (loop-item.js). The whole card
 * links to the item through the section's own "whole section as a link"
 * (buttons and links inside keep working). An image shown "Behind the
 * whole card" gives the card its shape (ratio or height).
 */
import { computed, provide } from 'vue'
import SectionTemplate from '../sections/SectionTemplate.vue'
import { LOOP_ITEM, loopItemName, loopItemUrl } from './loop-item.js'
import { asResponsive, toCssLength, DEVICES } from 'src/composables/useSectionStyle.js'

const props = defineProps({
  sections: { type: Array, required: true },
  type: { type: String, required: true },
  item: { type: Object, required: true },
  // Among the page's first cards: its image loads first.
  priority: { type: Boolean, default: false },
})

provide(LOOP_ITEM, computed(() => ({ type: props.type, item: props.item, priority: props.priority })))

const linked = computed(() => {
  const url = loopItemUrl(props.type, props.item)
  const list = (props.sections || []).filter((s) => s && s.enabled !== false)
  if (!url) return list
  const label = loopItemName(props.type, props.item)
  return list.map((s) => ({ ...s, style: { ...(s.style || {}), link_url: url, link_new_tab: false, link_label: label } }))
})

const IMAGE_BLOCKS = new Set(['lp_image', 'lc_image', 'lpo_image'])
const RATIOS = new Set(['1/1', '4/5', '3/4', '2/3', '4/3', '3/2', '16/9'])
const SHORT = { desktop: 'd', tablet: 't', mobile: 'm' }
const SUFFIX = { desktop: '', tablet: '-t', mobile: '-m' }

// An image "Behind the whole card" sets the card's shape.
const shape = computed(() => {
  const first = (props.sections || []).find((s) => s && s.enabled !== false)
  const bg = (first?.blocks || []).find((b) => IMAGE_BLOCKS.has(b.type) && b.enabled !== false && b.data?.display === 'background')
  if (!bg) return { classes: {}, vars: {} }
  const ratio = asResponsive(bg.data.aspect_ratio || '1/1')
  const height = asResponsive(bg.data.image_height)
  const classes = { 'lt-card--bg': true }
  const vars = {}
  for (const device of DEVICES) {
    const h = toCssLength(height[device])
    if (h) {
      vars[`--lt-ch${SUFFIX[device]}`] = h
      classes[`lt-ch-${SHORT[device]}`] = true
    } else if (RATIOS.has(ratio[device])) {
      vars[`--lt-cr${SUFFIX[device]}`] = ratio[device].replace('/', ' / ')
      classes[`lt-cr-${SHORT[device]}`] = true
    }
  }
  return { classes, vars }
})
</script>

<style>
/* ---- Card designs (loop templates) ---- */
.lt-card { position: relative; height: 100%; min-width: 0; }
.lt-card > .sb-container { height: 100%; }
.lt-card > .sb-container > .sb-inner { flex: 1 1 auto; width: 100%; }

/* An image behind the whole card: under the cover link and the other blocks. */
.lt-card--bg > .sb-container > .sb-inner { position: static; }
.lt-card--bg > .sb-container > .sb-inner > .sb-block { position: relative; z-index: 2; }
.lt-card--bg > .sb-container > .sb-inner > .sb-block:has(> .lt-img--bg) { position: static !important; z-index: auto; margin: 0; }
.lt-img--bg { position: absolute !important; inset: 0; z-index: 0; border-radius: inherit; }
@media (min-width: 1024px) {
  .lt-cr-d > .sb-container { aspect-ratio: var(--lt-cr); }
  .lt-ch-d > .sb-container { min-height: var(--lt-ch); }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .lt-cr-t > .sb-container { aspect-ratio: var(--lt-cr-t, var(--lt-cr)); }
  .lt-ch-t > .sb-container { min-height: var(--lt-ch-t, var(--lt-ch)); }
}
@media (max-width: 767px) {
  .lt-cr-m > .sb-container { aspect-ratio: var(--lt-cr-m, var(--lt-cr-t, var(--lt-cr))); }
  .lt-ch-m > .sb-container { min-height: var(--lt-ch-m, var(--lt-ch-t, var(--lt-ch))); }
}

/* Card images (LoopImage.vue). */
.lt-img {
  position: relative;
  overflow: hidden;
  width: 100%;
  border-radius: var(--lt-radius, 0);
  border: var(--lt-bw, 0) solid var(--lt-bc, rgba(0, 0, 0, .1));
  background: rgba(0, 0, 0, .04);
}
.lt-img__img { display: block; width: 100%; height: 100%; object-fit: var(--lt-fit, cover); transition: transform .6s ease, opacity .4s ease; }
.lt-img--bg .lt-img__img, .lt-img.lt-sized .lt-img__img { position: absolute; inset: 0; }
.lt-img__second { position: absolute; inset: 0; opacity: 0; }
.lt-img__shade { position: absolute; inset: 0; pointer-events: none; background: var(--lt-shade, #000); opacity: var(--lt-shade-o, .4); }
.lt-img__shade--bottom { background: linear-gradient(to top, var(--lt-shade, #000), transparent 70%); opacity: var(--lt-shade-o, .4); }
.lt-img__shade--top { background: linear-gradient(to bottom, var(--lt-shade, #000), transparent 70%); opacity: var(--lt-shade-o, .4); }
@media (min-width: 1024px) {
  .lt-r-d { aspect-ratio: var(--lt-ratio); }
  .lt-h-d { height: var(--lt-h); }
  .lt-f-d { flex: 1 1 auto; min-height: 160px; }
  .lt-card .sb-block:has(> .lt-f-d) { flex: 1 1 auto; display: flex; flex-direction: column; }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .lt-r-t { aspect-ratio: var(--lt-ratio-t, var(--lt-ratio)); }
  .lt-h-t { height: var(--lt-h-t, var(--lt-h)); }
  .lt-f-t { flex: 1 1 auto; min-height: 160px; }
  .lt-card .sb-block:has(> .lt-f-t) { flex: 1 1 auto; display: flex; flex-direction: column; }
}
@media (max-width: 767px) {
  .lt-r-m { aspect-ratio: var(--lt-ratio-m, var(--lt-ratio-t, var(--lt-ratio))); }
  .lt-h-m { height: var(--lt-h-m, var(--lt-h-t, var(--lt-h))); }
  .lt-f-m { flex: 1 1 auto; min-height: 160px; }
  .lt-card .sb-block:has(> .lt-f-m) { flex: 1 1 auto; display: flex; flex-direction: column; }
}
@media (hover: hover) {
  .lt-card:hover .lt-img--zoom .lt-img__img { transform: scale(1.06); }
  .lt-card:hover .lt-img--darken .lt-img__img { opacity: .82; }
  .lt-card:hover .lt-img--swap .lt-img__second { opacity: 1; }
}
/* Touch screens: while a finger is on it (boot/touch-press.js). */
.lt-card.is-pressed .lt-img--zoom .lt-img__img { transform: scale(1.06); }
.lt-card.is-pressed .lt-img--darken .lt-img__img { opacity: .82; }
.lt-card.is-pressed .lt-img--swap .lt-img__second { opacity: 1; }
.lt-img--darken { background: #000; }
@media (prefers-reduced-motion: reduce) {
  .lt-img__img { transition: none; }
}
.lt-img__badge {
  position: absolute;
  z-index: 3;
  margin: 10px;
  padding: 3px 8px;
  font-size: 11px;
  line-height: 1.3;
  letter-spacing: .04em;
  background: var(--q-bg, #fff);
  color: var(--q-text, #222);
}
.lt-img__badge--top-start { top: 0; inset-inline-start: 0; }
.lt-img__badge--top-end { top: 0; inset-inline-end: 0; }
.lt-img__badge--bottom-start { bottom: 0; inset-inline-start: 0; }
.lt-img__badge--bottom-end { bottom: 0; inset-inline-end: 0; }
.lt-img__icons { position: absolute; z-index: 3; top: 6px; inset-inline-end: 6px; display: flex; flex-direction: column; gap: 6px; pointer-events: auto; color: var(--lt-icons, inherit); }
.lt-img__icons--outline { top: 10px; inset-inline-end: 10px; }
.lt-img__icons--outline .q-btn { width: 32px; height: 32px; min-height: 32px; border: 1.5px solid currentColor; background: rgba(255, 255, 255, .85); font-size: 12px; }

/* Card texts (LoopText.vue): cut after n lines. */
.lt-text { margin: 0; overflow-wrap: anywhere; }
.lt-text--clamp { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: var(--lt-lines); line-clamp: var(--lt-lines); overflow: hidden; }
.lt-text a { color: inherit; text-decoration: none; }
.lt-text a:hover { text-decoration: underline; }

/* Alignment of card texts, prices, stars and buttons (per screen size). */
.lt-align { text-align: var(--lt-ta, start); }
@media (min-width: 768px) and (max-width: 1023px) { .lt-align { text-align: var(--lt-ta-t, var(--lt-ta, start)); } }
@media (max-width: 767px) { .lt-align { text-align: var(--lt-ta-m, var(--lt-ta-t, var(--lt-ta, start))); } }

.lt-price del { opacity: .6; margin-inline-start: 6px; font-family: var(--lt-old-font, inherit); font-size: var(--lt-old-size, .85em); color: var(--lt-old-color, inherit); }
.lt-price ins { text-decoration: none; }
.lt-price--no-old del, .lt-price--no-old .screen-reader-text { display: none; }
.lt-price .screen-reader-text { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

.lt-stars { display: inline-flex; align-items: center; gap: 6px; font-size: var(--lt-star, 14px); line-height: 1; }
@media (min-width: 768px) and (max-width: 1023px) { .lt-stars { font-size: var(--lt-star-t, var(--lt-star, 14px)); } }
@media (max-width: 767px) { .lt-stars { font-size: var(--lt-star-m, var(--lt-star-t, var(--lt-star, 14px))); } }
.lt-stars__row { position: relative; display: inline-block; letter-spacing: .1em; color: rgba(0, 0, 0, .18); }
.lt-stars__fill { position: absolute; inset-block: 0; inset-inline-start: 0; overflow: hidden; white-space: nowrap; color: var(--lt-star-color, var(--q-secondary)); }
.lt-stars__count { font-size: .85em; opacity: .7; }

.lt-cart-btn.lt-cart-btn--full { width: 100%; }
.lt-cart-btn { border-radius: var(--lt-btn-radius, 4px); }
.lt-cart-btn.lt-cart-btn--round { width: var(--lt-btn-round, 44px); height: var(--lt-btn-round, 44px); min-height: 0; padding: 0; border-radius: 50%; }
.lt-cart-btn .q-icon { font-size: var(--lt-btn-icon, 20px); }
.lt-cart-btn.q-btn--outline::before { border-color: var(--lt-btn-border, currentColor); border-width: 2px; }
/* Space Between Icon and Text, per screen size (logical margins replace Quasar's on-left / on-right). */
.lt-cart-btn.has-icon-gap { --lt-gap-now: var(--lt-btn-gap, 12px); }
@media (max-width: 1023px) { .lt-cart-btn.has-icon-gap { --lt-gap-now: var(--lt-btn-gap-t, var(--lt-btn-gap, 12px)); } }
@media (max-width: 767px) { .lt-cart-btn.has-icon-gap { --lt-gap-now: var(--lt-btn-gap-m, var(--lt-btn-gap-t, var(--lt-btn-gap, 12px))); } }
.lt-cart-btn.has-icon-gap .q-icon.on-left { margin-inline: 0 var(--lt-gap-now); }
.lt-cart-btn.has-icon-gap .q-icon.on-right { margin-inline: var(--lt-gap-now) 0; }
</style>
