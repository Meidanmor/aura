<template>
  <ol v-if="items.length" class="tl" :class="layoutClasses" :style="vars">
    <li v-for="(item, i) in items" :key="i" class="tl__step" :class="i % 2 ? 'tl__step--b' : 'tl__step--a'">
      <span class="tl__marker" aria-hidden="true">
        <template v-if="marker === 'number'">{{ i + 1 }}</template>
        <q-icon v-else-if="marker === 'check'" :name="checkIcon" />
        <q-icon v-else-if="marker === 'icon'" :name="iconOf(item)" />
      </span>
      <div class="tl__body" :class="{ 'tl__body--card': card }">
        <h3 class="tl__title" :class="titleText.class" :style="titleText.style">
          <template v-if="d.number_titles">{{ i + 1 }}. </template>{{ item.title }}
        </h3>
        <!-- eslint-disable-next-line vue/no-v-html -- cleaned builder HTML -->
        <div v-if="item.text" class="tl__text" :class="bodyText.class" :style="bodyText.style" v-html="sanitizeBuilderHtml(item.text)" />
      </div>
    </li>
  </ol>
</template>

<script setup>
import { computed } from 'vue'
import { matCheck } from '@quasar/extras/material-icons'
import { generalIcons } from 'src/utils/builder-icons.js'
import { sanitizeBuilderHtml } from 'src/utils/sanitizeHtml.js'
import { gradientOf } from 'src/utils/gradient.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { asResponsive, setResponsiveVar, toCssLength, DEVICES } from 'src/composables/useSectionStyle.js'

/**
 * "Steps / Timeline": numbered steps along a line, in the middle with steps on
 * both sides, at the start, or in a row with the line above (each per screen size).
 * Markers: the step's number, a check, its own icon or a dot.
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' } })
const d = computed(() => props.data.data || {})
const items = computed(() => (d.value.items || []).filter((i) => i.title))
const MARKERS = new Set(['number', 'check', 'icon', 'dot'])
const marker = computed(() => (MARKERS.has(d.value.marker) ? d.value.marker : 'number'))
const checkIcon = matCheck
const iconOf = (item) => generalIcons[item.icon] || matCheck
const card = computed(() => d.value.card !== false)
const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))
const bodyText = computed(() => textStyle(d.value, tsKeys('text')))

const LAYOUTS = new Set(['alternate', 'start', 'horizontal'])
const SHORT = { desktop: 'd', tablet: 't', mobile: 'm' }
// Layout per screen size; a smaller one left empty keeps the bigger one's. Phones never alternate.
const layoutClasses = computed(() => {
  const r = asResponsive(d.value.layout || 'alternate')
  const c = { 'tl--dot': marker.value === 'dot', 'tl--shadow': card.value && d.value.card_shadow !== false }
  let last = 'alternate'
  for (const device of DEVICES) {
    let l = LAYOUTS.has(r[device]) ? r[device] : last
    last = l
    if (device === 'mobile' && l === 'alternate') l = 'start'
    c[`tl-${SHORT[device]}-${l}`] = true
  }
  return c
})

const vars = computed(() => {
  const v = {}
  setResponsiveVar(v, '--tl-gap', d.value.gap, toCssLength)
  const size = toCssLength(d.value.marker_size)
  if (size) v['--tl-size'] = size
  const bg = gradientOf(d.value.marker_bg || 'global:secondary', d.value.marker_bg2, 135)
  if (bg) v['--tl-marker'] = bg
  const mc = resolveGlobalColor(d.value.marker_color)
  if (mc) v['--tl-marker-text'] = mc
  const line = resolveGlobalColor(d.value.line_color)
  if (line) v['--tl-line'] = line
  const lw = toCssLength(d.value.line_width)
  if (lw) v['--tl-lw'] = lw
  const cbg = resolveGlobalColor(d.value.card_bg)
  if (cbg) v['--tl-card'] = cbg
  const cr = toCssLength(d.value.card_radius)
  if (cr) v['--tl-radius'] = cr
  const cp = toCssLength(d.value.card_padding)
  if (cp) v['--tl-pad'] = cp
  return v
})
</script>

<style scoped>
.tl { --tl-s: var(--tl-size, 40px); list-style: none; margin: 0; padding: 0; position: relative; display: grid; gap: var(--tl-gap, 32px); }
.tl--dot { --tl-s: var(--tl-size, 16px); }
.tl__step { position: relative; }
.tl__marker {
  position: absolute; z-index: 1; display: grid; place-items: center;
  width: var(--tl-s); height: var(--tl-s); border-radius: 50%;
  background: var(--tl-marker, var(--q-secondary)); color: var(--tl-marker-text, #fff);
  font-weight: 700; font-size: calc(var(--tl-s) * .42); line-height: 1;
  box-shadow: 0 0 0 6px var(--tl-ring, #fff);
}
.tl__marker .q-icon { font-size: calc(var(--tl-s) * .55); }
.tl__body--card { background: var(--tl-card, #fff); border-radius: var(--tl-radius, 16px); padding: var(--tl-pad, 24px); }
.tl--shadow .tl__body--card { box-shadow: 0 10px 30px -12px rgba(15, 30, 60, .22), 0 2px 6px rgba(15, 30, 60, .06); }
.tl__title { margin: 0 0 8px; font-size: 1.25em; line-height: 1.3; font-weight: 700; }
.tl__text { line-height: 1.6; opacity: .85; }
.tl__text :deep(p) { margin: 0 0 .6em; }
.tl__text :deep(p:last-child) { margin: 0; }

/* The line: drawn on the list, under the markers. */
.tl::before { content: ''; position: absolute; background: var(--tl-line, rgba(0, 0, 0, .14)); }

/* Line in the middle, steps on both sides (the start side first). */
@media (min-width: 1024px) {
  .tl-d-alternate::before { top: 0; bottom: 0; inset-inline-start: 50%; width: var(--tl-lw, 2px); transform: translateX(-50%); }
  .tl-d-alternate .tl__step { width: calc(50% - var(--tl-s) / 2 - 28px); }
  .tl-d-alternate .tl__step--b { margin-inline-start: auto; }
  .tl-d-alternate .tl__marker { top: 50%; transform: translateY(-50%); }
  .tl-d-alternate .tl__step--a .tl__marker { inset-inline-end: calc(-28px - var(--tl-s) / 2 - var(--tl-s) / 2); }
  .tl-d-alternate .tl__step--b .tl__marker { inset-inline-start: calc(-28px - var(--tl-s) / 2 - var(--tl-s) / 2); }
}
/* Line at the start; in a row, line above. */
@media (min-width: 1024px) {
  .tl-d-start::before { top: 0; bottom: 0; inset-inline-start: calc(var(--tl-s) / 2); width: var(--tl-lw, 2px); transform: translateX(-50%); }
  .tl-d-start .tl__step { padding-inline-start: calc(var(--tl-s) + 24px); }
  .tl-d-start .tl__marker { top: 0; inset-inline-start: 0; }
  .tl-d-horizontal { grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); }
  .tl-d-horizontal::before { top: calc(var(--tl-s) / 2); inset-inline: 0; height: var(--tl-lw, 2px); transform: translateY(-50%); }
  .tl-d-horizontal .tl__step { padding-top: calc(var(--tl-s) + 20px); }
  .tl-d-horizontal .tl__marker { top: 0; inset-inline-start: 0; }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .tl { gap: var(--tl-gap-t, var(--tl-gap, 32px)); }
  .tl::before { inset: auto; width: auto; height: auto; transform: none; }
  .tl__step { width: auto; margin: 0; padding: 0; }
  .tl__marker { inset: auto; transform: none; }
  .tl-t-alternate::before { top: 0; bottom: 0; inset-inline-start: 50%; width: var(--tl-lw, 2px); transform: translateX(-50%); }
  .tl-t-alternate .tl__step { width: calc(50% - var(--tl-s) / 2 - 20px); }
  .tl-t-alternate .tl__step--b { margin-inline-start: auto; }
  .tl-t-alternate .tl__marker { top: 50%; transform: translateY(-50%); }
  .tl-t-alternate .tl__step--a .tl__marker { inset-inline-end: calc(-20px - var(--tl-s)); }
  .tl-t-alternate .tl__step--b .tl__marker { inset-inline-start: calc(-20px - var(--tl-s)); }
  .tl-t-start { grid-auto-flow: row; }
  .tl-t-start::before { top: 0; bottom: 0; inset-inline-start: calc(var(--tl-s) / 2); width: var(--tl-lw, 2px); transform: translateX(-50%); }
  .tl-t-start .tl__step { padding-inline-start: calc(var(--tl-s) + 20px); }
  .tl-t-start .tl__marker { top: 0; inset-inline-start: 0; }
  .tl-t-horizontal { grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); }
  .tl-t-horizontal::before { top: calc(var(--tl-s) / 2); inset-inline: 0; height: var(--tl-lw, 2px); transform: translateY(-50%); }
  .tl-t-horizontal .tl__step { padding-top: calc(var(--tl-s) + 20px); }
  .tl-t-horizontal .tl__marker { top: 0; inset-inline-start: 0; }
}
@media (max-width: 767px) {
  .tl { gap: var(--tl-gap-m, var(--tl-gap-t, var(--tl-gap, 24px))); grid-auto-flow: row; }
  .tl::before { inset: auto; width: auto; height: auto; transform: none; }
  .tl__step { width: auto; margin: 0; padding: 0; }
  .tl__marker { inset: auto; transform: none; }
  .tl-m-start::before { top: 0; bottom: 0; inset-inline-start: calc(var(--tl-s) / 2); width: var(--tl-lw, 2px); transform: translateX(-50%); }
  .tl-m-start .tl__step { padding-inline-start: calc(var(--tl-s) + 16px); }
  .tl-m-start .tl__marker { top: 0; inset-inline-start: 0; }
  .tl-m-horizontal { grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); }
  .tl-m-horizontal::before { top: calc(var(--tl-s) / 2); inset-inline: 0; height: var(--tl-lw, 2px); transform: translateY(-50%); }
  .tl-m-horizontal .tl__step { padding-top: calc(var(--tl-s) + 14px); }
  .tl-m-horizontal .tl__marker { top: 0; inset-inline-start: 0; }
  .tl__body--card { padding: var(--tl-pad-m, 18px); }
}
</style>
