<template>
  <div v-if="cfg.on" class="a11y-ui">
    <button
        v-if="showButton && place"
        ref="btnEl"
        type="button"
        class="a11y-fab"
        :class="{ 'dock-movable': movable }"
        :style="fabStyle"
        data-dock
        :aria-label="t('Accessibility options')"
        aria-haspopup="dialog"
        :aria-expanded="open ? 'true' : 'false'"
        @pointerdown="drag.down($event, btnEl)"
        @click.capture="drag.click"
        @contextmenu="movable && $event.preventDefault()"
        @click="toggle"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4.2" r="2.2" /><path d="M4.5 7.6c2.3.7 4.8 1 7.5 1s5.2-.3 7.5-1l.5 1.9c-1.9.6-3.9.9-6 1.1v3.5l2.6 7.2-1.9.7L12 15.3 9.3 22l-1.9-.7L10 14.1v-3.5c-2.1-.2-4.1-.5-6-1.1z" /></svg>
    </button>
    <A11yPanel v-if="loaded" v-show="open" :open="open" :cfg="cfg" :prefs="prefs" :side="side" :color="color" @close="close" @change="onChange" />
    <!-- Reading guide (a line) and reading mask (only a band stays clear). With a mouse they follow
         it; on touch screens they stay where they are while the page scrolls under them, and the
         round handle drags them (a finger on the page would cover the line). -->
    <div v-if="prefs.guide" class="a11y-guide" :style="{ top: `${lineY - 3}px` }" aria-hidden="true" />
    <template v-if="prefs.mask">
      <div class="a11y-mask a11y-mask--top" :style="{ height: `${Math.max(0, lineY - 50)}px` }" aria-hidden="true" />
      <div class="a11y-mask a11y-mask--bottom" :style="{ top: `${lineY + 50}px` }" aria-hidden="true" />
    </template>
    <button
        v-if="touch && (prefs.guide || prefs.mask)"
        type="button"
        class="a11y-grip"
        :style="{ top: `${lineY - 22}px` }"
        :aria-label="t('Move the reading guide')"
        @pointerdown="gripDown"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l4 4h-3v5h-2V6H8zm0 20l-4-4h3v-5h2v5h3z" /></svg>
    </button>
  </div>
</template>

<script setup>
/**
 * The accessibility tool's button (dashboard: Settings → Accessibility; on by default). Drawn in the
 * browser only, after hydration, fixed in a bottom corner: no layout shift. The panel's code loads on
 * the first tap. Links whose address ends with "#accessibility" open it too.
 *
 * Its place and size: the floating buttons layout (Store builder → Floating buttons; floating-dock.js),
 * with the Contact, cookie and Help buttons, so none covers another.
 */
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'src/i18n/index.js'
import { applyPrefs, readPrefs } from 'src/utils/a11y-prefs.js'
import { dock, dockDrag, dockShow, dockStyle } from 'src/utils/floating-dock.js'

const A11yPanel = defineAsyncComponent(() => import('./A11yPanel.vue'))
const { t } = useI18n()

const cfg = computed(() => {
  const c = (typeof window !== 'undefined' && window.__QWOO_SITE__?.a11y) || { on: true }
  return { on: c.on !== false, place: c.place || 'auto', color: c.color || '', size: c.size || 'm', phone: c.phone || 'show', off: c.off || [], contact: c.contact || {} }
})
const color = computed(() => cfg.value.color || 'var(--q-secondary, #1f5a43)')

const prefs = reactive(readPrefs())
const open = ref(false)
const loaded = ref(false)
const btnEl = ref(null)
const pointerY = ref(-200)

// "Hide the button on phones" (Settings → Accessibility): the panel still opens from "#accessibility" links.
const showButton = computed(() => cfg.value.on && !(dock.phone && cfg.value.phone === 'hide'))
const place = computed(() => dockStyle('a11y'))
const side = computed(() => dock.pos.a11y?.side || (typeof document !== 'undefined' && document.documentElement.dir === 'rtl' ? 'left' : 'right'))
const movable = computed(() => !!dock.cfg.buttons.a11y?.move)
const drag = dockDrag('a11y')
const fabStyle = computed(() => ({ ...place.value, '--a11y-color': color.value }))
watch(showButton, (on) => dockShow('a11y', on), { immediate: true })

function toggle() {
  if (open.value) return close()
  loaded.value = true
  open.value = true
}
function close() {
  open.value = false
}
function onChange(next) {
  Object.keys(prefs).forEach((k) => delete prefs[k])
  Object.assign(prefs, next)
  applyPrefs({ ...prefs })
}

/* ---------- reading guide / mask ---------- */
// The line: just under a mouse pointer (the text being read stays above it); on touch screens
// where it was left (pointerY), kept inside the screen.
const touch = ref(false)
const lineY = computed(() => {
  const h = typeof window !== 'undefined' ? window.innerHeight : 800
  const y = touch.value ? pointerY.value : pointerY.value + 18
  return Math.min(h - 30, Math.max(30, y))
})
function onPointer(e) {
  if (e.pointerType && e.pointerType !== 'mouse') return
  if (gripping) return
  if (touch.value) touch.value = false
  pointerY.value = e.clientY
}
function onPointerDown(e) {
  // A finger or pen on the page: the guide stays put and gets its handle.
  if (e.pointerType && e.pointerType !== 'mouse') touch.value = true
}
let gripping = false
function gripDown(e) {
  e.preventDefault()
  gripping = true
  touch.value = true
  const el = e.currentTarget
  try { el.setPointerCapture(e.pointerId) } catch { /* old browsers */ }
  const move = (ev) => { pointerY.value = ev.clientY }
  const up = () => {
    gripping = false
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerup', up)
    el.removeEventListener('pointercancel', up)
  }
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointercancel', up)
}

/* ---------- "#accessibility" links ---------- */
function onLink(e) {
  const a = e.target?.closest?.('a[href$="#accessibility"]')
  if (!a) return
  e.preventDefault()
  loaded.value = true
  open.value = true
}

onMounted(() => {
  pointerY.value = Math.round(window.innerHeight / 2)
  touch.value = !!window.matchMedia?.('(hover: none)').matches
  window.addEventListener('pointermove', onPointer, { passive: true })
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  document.addEventListener('click', onLink)
  // Videos that started before the choices were read (background videos) stop too.
  if (prefs.motion) applyPrefs({ ...prefs })
})
onBeforeUnmount(() => {
  dockShow('a11y', false)
  window.removeEventListener('pointermove', onPointer)
  window.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('click', onLink)
})
</script>

<style scoped>
/* Placed by the floating buttons layout (fixed, its corner, above bars). */
.a11y-fab {
  width: var(--dock-size, 52px);
  height: var(--dock-size, 52px);
  border: 2px solid #fff;
  border-radius: 50%;
  background: var(--a11y-color);
  color: #fff;
  display: grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, .28);
}
.a11y-fab svg { width: 58%; height: 58%; }
.a11y-fab:focus-visible { outline: 3px solid #000; outline-offset: 3px; box-shadow: 0 0 0 6px #fff; }
.a11y-guide {
  position: fixed;
  inset-inline: 0;
  height: 6px;
  z-index: 2390;
  background: #0a6cff;
  opacity: .85;
  pointer-events: none;
}
.a11y-mask {
  position: fixed;
  inset-inline: 0;
  z-index: 2390;
  background: rgba(0, 0, 0, .55);
  pointer-events: none;
}
.a11y-grip {
  position: fixed;
  inset-inline-end: 6px;
  z-index: 2391;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: #0a6cff;
  color: #fff;
  display: grid;
  place-items: center;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .3);
  touch-action: none;
  cursor: grab;
}
.a11y-grip svg { width: 60%; height: 60%; }
.a11y-grip:focus-visible { outline: 3px solid #000; outline-offset: 2px; }
.a11y-mask--top { top: 0; }
.a11y-mask--bottom { bottom: 0; }
@media print { .a11y-ui { display: none; } }
</style>
