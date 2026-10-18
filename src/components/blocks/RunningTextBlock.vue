<template>
  <div
      v-if="items.length"
      ref="root"
      class="running-text"
      :class="[`rt--${direction}`, { 'rt--pause': pauseOnHover, 'rt--lines': d.lines, 'rt--upper': d.uppercase, 'rt--still': still }]"
      :style="cssVars"
      @mouseenter="hovering = true"
      @mouseleave="hovering = false"
  >
    <!-- Sideways: the texts twice in a row, moved by one copy's width (no script needed to move). -->
    <div v-if="direction !== 'up'" class="rt__viewport">
      <div class="rt__track">
        <div v-for="copy in 2" :key="copy" ref="groups" class="rt__group" :aria-hidden="copy > 1 ? 'true' : undefined">
          <template v-for="(item, idx) in items" :key="idx">
            <component
                :is="item.link_url ? linkTag(item.link_url) : 'span'"
                v-bind="item.link_url ? linkAttrs(item.link_url, copy > 1) : {}"
                class="rt__item"
                dir="auto"
            ><span v-bind="itemText">{{ item.text }}</span></component>
            <span v-if="separator" class="rt__sep" aria-hidden="true">{{ separator }}</span>
          </template>
        </div>
      </div>
    </div>

    <!-- Upward: one text at a time. -->
    <div v-else class="rt__window" :aria-live="'off'">
      <div class="rt__list" :class="{ 'rt__list--jump': jumping }" :style="{ transform: `translateY(${-index * 100}%)` }">
        <div v-for="(item, idx) in upItems" :key="idx" class="rt__line" :aria-hidden="idx >= items.length ? 'true' : undefined">
          <component
              :is="item.link_url ? linkTag(item.link_url) : 'span'"
              v-bind="item.link_url ? linkAttrs(item.link_url, idx >= items.length) : {}"
              class="rt__item"
              dir="auto"
          ><span v-bind="itemText">{{ item.text }}</span></component>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Running Text block: short texts moving sideways in a loop (a marquee), or
 * moving up one at a time (a ticker). The sideways loop is plain CSS: the
 * texts are shown twice and moved by one copy's width; the duration comes
 * from the measured width and the owner's speed (an estimate until then).
 * Visitors who turned animations off see the texts standing still.
 */
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { setResponsiveVar, toCssLength, alignToFlex } from 'src/composables/useSectionStyle.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})

const d = computed(() => props.data.data || {})
const itemText = computed(() => textStyle(d.value, tsKeys('text')))
const items = computed(() => (d.value.items || []).filter((i) => typeof i.text === 'string' && i.text.trim()))
const direction = computed(() => (['left', 'right', 'up'].includes(d.value.direction) ? d.value.direction : 'left'))
const separator = computed(() => (typeof d.value.separator === 'string' ? d.value.separator.trim().slice(0, 8) : ''))
const pauseOnHover = computed(() => d.value.pause_on_hover !== false)
const speed = computed(() => Math.min(300, Math.max(10, Number(d.value.speed) || 40)))
const seconds = computed(() => Math.min(30, Math.max(1, Number(d.value.seconds) || 3)))

const isInternal = (url) => url.startsWith('/') && !url.startsWith('//')
const linkTag = (url) => (isInternal(url) ? RouterLink : 'a')
// The repeated copy's links are skipped by the keyboard (the first copy has them).
const linkAttrs = (url, copy) => ({ ...(isInternal(url) ? { to: url } : { href: url }), ...(copy ? { tabindex: -1 } : {}) })

// One copy's width, measured after mounting; until then, an estimate from the text length.
const groupWidth = ref(0)
// (A copy is at least as wide as the screen; 1280px stands in for it on the server.)
const estimate = computed(() => Math.max(1280, items.value.reduce((w, i) => w + i.text.length * 9 + 64, 0)))
const cssVars = computed(() => {
  const vars = {}
  setResponsiveVar(vars, '--rt-gap', d.value.gap, toCssLength)
  setResponsiveVar(vars, '--rt-pad', d.value.padding_y, toCssLength)
  const ls = toCssLength(d.value.letter_spacing)
  if (ls && /^-?\d+(\.\d+)?(px|em|rem)$/.test(ls)) vars['--rt-ls'] = ls
  const line = resolveGlobalColor(d.value.line_color)
  if (line) vars['--rt-line'] = line
  const sep = resolveGlobalColor(d.value.separator_color)
  if (sep) vars['--rt-sep'] = sep
  vars['--rt-align'] = alignToFlex(d.value.alignment || 'center') || 'center'
  vars['--rt-duration'] = `${((groupWidth.value || estimate.value) / speed.value).toFixed(2)}s`
  vars['--rt-step'] = `${seconds.value}s`
  return vars
})

const root = ref(null)
const groups = ref([])
const hovering = ref(false)
const still = ref(false)

function measure() {
  const g = groups.value?.[0]
  if (g) groupWidth.value = g.getBoundingClientRect().width
}

// Upward: the first text is added again at the end, so the loop never jumps back visibly.
const upItems = computed(() => (items.value.length > 1 ? [...items.value, items.value[0]] : items.value))
const index = ref(0)
const jumping = ref(false)
let timer = null
let resizeObs = null

function tick() {
  if (still.value || (hovering.value && pauseOnHover.value) || items.value.length < 2) return
  index.value += 1
  if (index.value === items.value.length) {
    // Shown the copy of the first text: go back to the real one without the slide.
    setTimeout(() => {
      jumping.value = true
      index.value = 0
      nextTick(() => requestAnimationFrame(() => { jumping.value = false }))
    }, 600)
  }
}

function start() {
  stop()
  if (direction.value === 'up') timer = setInterval(tick, seconds.value * 1000)
}
function stop() {
  if (timer) clearInterval(timer)
  timer = null
}

onMounted(() => {
  still.value = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false
  measure()
  if ('ResizeObserver' in window && groups.value?.[0]) {
    resizeObs = new ResizeObserver(measure)
    resizeObs.observe(groups.value[0])
  }
  start()
})
onUnmounted(() => {
  stop()
  resizeObs?.disconnect()
})
watch([direction, seconds], start)
</script>

<style scoped>
/* Positions here are measured left to right on every page (the layer is dir="ltr"): not flipped for Hebrew. */
/* rtl:begin:ignore */
.running-text {
  overflow: hidden;
  padding-block: var(--rt-pad, 12px);
  letter-spacing: var(--rt-ls, normal);
}
.rt--lines {
  border-block: 1px solid var(--rt-line, rgba(0, 0, 0, 0.12));
}
.rt--upper { text-transform: uppercase; }

/* ---- Sideways ---- */
.rt__viewport {
  overflow: hidden;
  /* The loop is measured left to right on every page; each text keeps its own direction. */
  direction: ltr;
}
.rt__track {
  display: flex;
  width: max-content;
  animation: rt-move var(--rt-duration, 30s) linear infinite;
}
.rt--right .rt__track { animation-direction: reverse; }
.rt__group {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  min-width: 100vw;
  justify-content: space-around;
  gap: var(--rt-gap, 32px);
  padding-inline-end: var(--rt-gap, 32px);
  white-space: nowrap;
}
.rt__item {
  color: inherit;
  text-decoration: none;
}
a.rt__item:hover { text-decoration: underline; }
.rt__sep { color: var(--rt-sep, currentColor); opacity: 0.7; }
@keyframes rt-move {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@media (hover: hover) {
  .rt--pause:hover .rt__track { animation-play-state: paused; }
}

/* ---- Upward ---- */
.rt__window {
  height: 1.6em;
  line-height: 1.6em;
  overflow: hidden;
}
.rt__list {
  transition: transform 0.6s cubic-bezier(.2, .7, .2, 1);
}
.rt__list--jump { transition: none; }
.rt__line {
  height: 1.6em;
  display: flex;
  justify-content: var(--rt-align, center);
  white-space: nowrap;
}

/* ---- Visitors who turned animations off ---- */
.rt--still .rt__track { animation: none; }
@media (prefers-reduced-motion: reduce) {
  .rt__track { animation: none; }
  .rt__list { transition: none; }
}

@media (max-width: 1023px) {
  .running-text { padding-block: var(--rt-pad-t, var(--rt-pad, 12px)); }
  .rt__group { gap: var(--rt-gap-t, var(--rt-gap, 32px)); padding-inline-end: var(--rt-gap-t, var(--rt-gap, 32px)); }
}
@media (max-width: 767px) {
  .running-text { padding-block: var(--rt-pad-m, var(--rt-pad-t, var(--rt-pad, 12px))); }
  .rt__group { gap: var(--rt-gap-m, var(--rt-gap-t, var(--rt-gap, 32px))); padding-inline-end: var(--rt-gap-m, var(--rt-gap-t, var(--rt-gap, 32px))); }
}
/* rtl:end:ignore */
</style>
