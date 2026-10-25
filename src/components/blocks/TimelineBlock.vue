<template>
  <ol
      v-if="items.length"
      ref="listEl"
      class="tl"
      :class="[layoutClasses, liveClasses]"
      :style="[vars, liveVars]"
      @mouseenter="hovering = true"
      @mouseleave="hovering = false"
      @focusin="hovering = true"
      @focusout="hovering = false"
  >
    <li
        v-for="(item, i) in items"
        :key="i"
        class="tl__step"
        :class="[i % 2 ? 'tl__step--b' : 'tl__step--a', live ? (i < current ? 'is-done' : i === current ? 'is-current' : 'is-ahead') : '']"
    >
      <!-- Click / plays by itself: the whole step picks it (stretched over the step). -->
      <button
          v-if="clickable"
          type="button"
          class="tl__hit"
          :aria-label="item.title"
          :aria-current="i === current ? 'step' : undefined"
          @click="pick(i)"
      />
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
        <div v-if="item.text" class="tl__fold">
          <div class="tl__text" :class="bodyText.class" :style="bodyText.style" v-html="sanitizeBuilderHtml(item.text)" />
        </div>
      </div>
    </li>
  </ol>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
 * Interaction (optional): a coloured line fills up to the current step and the
 * steps after it are dimmed: as the shopper scrolls, on a click, or by itself
 * (auto: the line fills toward the next step, pauses on hover / focus, stops
 * after a click; never with reduced motion, where it works like click).
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

/* ---------- interaction ---------- */
const INTERACTIONS = new Set(['none', 'scroll', 'click', 'auto'])
const interaction = computed(() => (INTERACTIONS.has(d.value.interaction) ? d.value.interaction : 'none'))
const live = computed(() => interaction.value !== 'none')
const listEl = ref(null)
const current = ref(interaction.value === 'scroll' ? -1 : 0)
const progress = ref(0) // 0..1 along the line
const fillSeconds = ref(0) // transition time of the fill
const hovering = ref(false)
const stopped = ref(false) // auto play stops for good after a click
const reduced = ref(false)
const inView = ref(false)
const mode = computed(() => (interaction.value === 'auto' && reduced.value ? 'click' : interaction.value))
const clickable = computed(() => mode.value === 'click' || mode.value === 'auto')
const seconds = computed(() => Math.min(20, Math.max(2, Number(d.value.step_seconds) || 5)))

const liveClasses = computed(() => (live.value ? { 'tl--live': true, 'tl--collapse': clickable.value && !!d.value.collapse, 'tl--pick': clickable.value } : {}))
const geo = ref({ vertical: true, rtl: false, marks: [] }) // marker centres, 0..1 along the line
const liveVars = computed(() => {
  if (!live.value) return {}
  const rest = ((1 - Math.min(1, Math.max(0, progress.value))) * 100).toFixed(2) + '%'
  const { vertical, rtl } = geo.value
  const v = {
    '--tl-clip': vertical ? `inset(0 0 ${rest} 0)` : rtl ? `inset(0 0 0 ${rest})` : `inset(0 ${rest} 0 0)`,
    '--tl-fill-s': fillSeconds.value + 's',
  }
  const fill = resolveGlobalColor(d.value.active_line_color)
  if (fill) v['--tl-fill'] = fill
  const idle = resolveGlobalColor(d.value.idle_marker_color)
  if (idle) v['--tl-idle'] = idle
  const dim = Number(d.value.dim_opacity)
  if (d.value.dim_opacity !== '' && d.value.dim_opacity !== undefined && Number.isFinite(dim)) v['--tl-dim'] = String(Math.min(100, Math.max(0, dim)) / 100)
  return v
})

/** Where each marker's centre sits along the line (the list's ::before), 0..1. */
function measure() {
  const el = listEl.value
  if (!el) return
  const box = el.getBoundingClientRect()
  const vertical = getComputedStyle(el).gridAutoFlow.indexOf('column') === -1
  const rtl = getComputedStyle(el).direction === 'rtl'
  const marks = [...el.querySelectorAll(':scope > .tl__step > .tl__marker')].map((m) => {
    const r = m.getBoundingClientRect()
    if (vertical) return box.height ? (r.top + r.height / 2 - box.top) / box.height : 0
    const x = r.left + r.width / 2 - box.left
    return box.width ? (rtl ? box.width - x : x) / box.width : 0
  })
  geo.value = { vertical, rtl, marks }
}
const markAt = (i) => geo.value.marks[i] ?? (i + 0.5) / Math.max(1, items.value.length)

/** Scroll: the line fills down to the middle of the screen; steps whose marker it passed light up. */
function onScroll() {
  const el = listEl.value
  if (!el || mode.value !== 'scroll') return
  const box = el.getBoundingClientRect()
  const mid = window.innerHeight * 0.55
  const p = geo.value.vertical
    ? (box.height ? (mid - box.top) / box.height : 0)
    : (mid - box.top) / Math.max(1, window.innerHeight * 0.4) // a row fills while it crosses the screen
  progress.value = Math.min(1, Math.max(0, p))
  let c = -1
  geo.value.marks.forEach((m, i) => { if (progress.value >= m - 0.001) c = i })
  current.value = c
}
let frame = 0
const onScrollFrame = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; onScroll() }) }

/** Click / auto: show step i; auto then fills toward the next one over its seconds. */
let timer = 0
function show(i, animateTo) {
  current.value = i
  clearTimeout(timer)
  if (animateTo) {
    const next = i + 1 < items.value.length ? markAt(i + 1) : 1
    fillSeconds.value = 0
    progress.value = markAt(i)
    // Next frame: fill toward the next step while this one is shown.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (current.value !== i || !playing()) return
      fillSeconds.value = seconds.value
      progress.value = next
    }))
    timer = setTimeout(() => { if (playing()) show((i + 1) % items.value.length, true) }, seconds.value * 1000)
  } else {
    fillSeconds.value = 0.5
    progress.value = markAt(i)
  }
}
const playing = () => mode.value === 'auto' && !stopped.value && !hovering.value && inView.value
function pick(i) {
  stopped.value = true
  show(i, false)
}
watch(playing, (on) => { if (on) show(current.value, true); else if (clickable.value) show(current.value, false) })

let ro = null
let io = null
onMounted(() => {
  if (!live.value) return
  reduced.value = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  measure()
  ro = new ResizeObserver(() => { measure(); if (mode.value === 'scroll') onScroll(); else show(current.value, playing()) })
  ro.observe(listEl.value)
  if (mode.value === 'scroll') {
    window.addEventListener('scroll', onScrollFrame, { passive: true })
    onScroll()
  } else {
    show(0, false)
    io = new IntersectionObserver(([e]) => { inView.value = e.isIntersecting }, { threshold: 0.35 })
    io.observe(listEl.value)
  }
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  cancelAnimationFrame(frame)
  ro?.disconnect()
  io?.disconnect()
  window.removeEventListener('scroll', onScrollFrame)
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
.tl::before, .tl::after { content: ''; position: absolute; background: var(--tl-line, rgba(0, 0, 0, .14)); }

/* Line in the middle, steps on both sides (the start side first). */
@media (min-width: 1024px) {
  .tl-d-alternate::before, .tl-d-alternate::after { top: 0; bottom: 0; inset-inline-start: 50%; width: var(--tl-lw, 2px); transform: translateX(-50%); }
  .tl-d-alternate .tl__step { width: calc(50% - var(--tl-s) / 2 - 28px); }
  .tl-d-alternate .tl__step--b { margin-inline-start: auto; }
  .tl-d-alternate .tl__marker { top: 50%; transform: translateY(-50%); }
  .tl-d-alternate .tl__step--a .tl__marker { inset-inline-end: calc(-28px - var(--tl-s) / 2 - var(--tl-s) / 2); }
  .tl-d-alternate .tl__step--b .tl__marker { inset-inline-start: calc(-28px - var(--tl-s) / 2 - var(--tl-s) / 2); }
}
/* Line at the start; in a row, line above. */
@media (min-width: 1024px) {
  .tl-d-start::before, .tl-d-start::after { top: 0; bottom: 0; inset-inline-start: calc(var(--tl-s) / 2); width: var(--tl-lw, 2px); transform: translateX(-50%); }
  .tl-d-start .tl__step { padding-inline-start: calc(var(--tl-s) + 24px); }
  .tl-d-start .tl__marker { top: 0; inset-inline-start: 0; }
  .tl-d-horizontal { grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); }
  .tl-d-horizontal::before, .tl-d-horizontal::after { top: calc(var(--tl-s) / 2); inset-inline: 0; height: var(--tl-lw, 2px); transform: translateY(-50%); }
  .tl-d-horizontal .tl__step { padding-top: calc(var(--tl-s) + 20px); }
  .tl-d-horizontal .tl__marker { top: 0; inset-inline-start: 0; }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .tl { gap: var(--tl-gap-t, var(--tl-gap, 32px)); }
  .tl::before, .tl::after { inset: auto; width: auto; height: auto; transform: none; }
  .tl__step { width: auto; margin: 0; padding: 0; }
  .tl__marker { inset: auto; transform: none; }
  .tl-t-alternate::before, .tl-t-alternate::after { top: 0; bottom: 0; inset-inline-start: 50%; width: var(--tl-lw, 2px); transform: translateX(-50%); }
  .tl-t-alternate .tl__step { width: calc(50% - var(--tl-s) / 2 - 20px); }
  .tl-t-alternate .tl__step--b { margin-inline-start: auto; }
  .tl-t-alternate .tl__marker { top: 50%; transform: translateY(-50%); }
  .tl-t-alternate .tl__step--a .tl__marker { inset-inline-end: calc(-20px - var(--tl-s)); }
  .tl-t-alternate .tl__step--b .tl__marker { inset-inline-start: calc(-20px - var(--tl-s)); }
  .tl-t-start { grid-auto-flow: row; }
  .tl-t-start::before, .tl-t-start::after { top: 0; bottom: 0; inset-inline-start: calc(var(--tl-s) / 2); width: var(--tl-lw, 2px); transform: translateX(-50%); }
  .tl-t-start .tl__step { padding-inline-start: calc(var(--tl-s) + 20px); }
  .tl-t-start .tl__marker { top: 0; inset-inline-start: 0; }
  .tl-t-horizontal { grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); }
  .tl-t-horizontal::before, .tl-t-horizontal::after { top: calc(var(--tl-s) / 2); inset-inline: 0; height: var(--tl-lw, 2px); transform: translateY(-50%); }
  .tl-t-horizontal .tl__step { padding-top: calc(var(--tl-s) + 20px); }
  .tl-t-horizontal .tl__marker { top: 0; inset-inline-start: 0; }
}
@media (max-width: 767px) {
  .tl { gap: var(--tl-gap-m, var(--tl-gap-t, var(--tl-gap, 24px))); grid-auto-flow: row; }
  .tl::before, .tl::after { inset: auto; width: auto; height: auto; transform: none; }
  .tl__step { width: auto; margin: 0; padding: 0; }
  .tl__marker { inset: auto; transform: none; }
  .tl-m-start::before, .tl-m-start::after { top: 0; bottom: 0; inset-inline-start: calc(var(--tl-s) / 2); width: var(--tl-lw, 2px); transform: translateX(-50%); }
  .tl-m-start .tl__step { padding-inline-start: calc(var(--tl-s) + 16px); }
  .tl-m-start .tl__marker { top: 0; inset-inline-start: 0; }
  .tl-m-horizontal { grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); }
  .tl-m-horizontal::before, .tl-m-horizontal::after { top: calc(var(--tl-s) / 2); inset-inline: 0; height: var(--tl-lw, 2px); transform: translateY(-50%); }
  .tl-m-horizontal .tl__step { padding-top: calc(var(--tl-s) + 14px); }
  .tl-m-horizontal .tl__marker { top: 0; inset-inline-start: 0; }
  .tl__body--card { padding: var(--tl-pad-m, 18px); }
}
/* Interaction: the filled line, done / current / later steps. */
.tl::after { content: none; }
.tl--live::after {
  content: ''; position: absolute; z-index: 0; background: var(--tl-fill, var(--tl-marker, var(--q-secondary)));
  clip-path: var(--tl-clip, inset(0 0 100% 0)); transition: clip-path var(--tl-fill-s, .5s) linear;
}
.tl--live .tl__step { transition: opacity .35s ease; }
.tl--live .tl__step.is-ahead { opacity: var(--tl-dim, .45); }
.tl--live .tl__step.is-ahead .tl__marker { background: var(--tl-idle, #d9dde3); color: var(--tl-marker-text, #fff); }
.tl--live .tl__marker { transition: background-color .35s ease, transform .35s ease; }
.tl--live .tl__step.is-current .tl__marker { box-shadow: 0 0 0 6px var(--tl-ring, #fff), 0 0 0 9px color-mix(in srgb, var(--tl-fill, var(--q-secondary)) 30%, transparent); }
.tl__hit { position: absolute; inset: 0; z-index: 2; width: 100%; padding: 0; border: 0; background: transparent; cursor: pointer; border-radius: var(--tl-radius, 16px); }
.tl__hit:focus-visible { outline: 2px solid var(--tl-fill, var(--q-secondary)); outline-offset: 4px; }
.tl--pick .tl__step:not(.is-current):hover { opacity: .8; }
/* Only the current step's text: folds open and closed. */
.tl__fold { display: grid; grid-template-rows: 1fr; transition: grid-template-rows .35s ease; }
.tl__fold > .tl__text { overflow: hidden; min-height: 0; }
.tl--collapse .tl__step:not(.is-current) .tl__fold { grid-template-rows: 0fr; }
@media (prefers-reduced-motion: reduce) {
  .tl--live::after, .tl--live .tl__step, .tl__fold { transition: none; }
}
</style>
