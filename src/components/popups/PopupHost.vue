<template>
  <q-dialog
      v-if="current"
      v-model="shown"
      class="qwoo-popup"
      :class="`qwoo-popup--${pos}`"
      :style="rootVars"
      :position="qPosition"
      :maximized="!!s.full_screen"
      :seamless="s.backdrop === 'none'"
      :no-backdrop-dismiss="s.close_outside === false"
      :no-esc-dismiss="s.close_esc === false"
      :transition-show="transition.show"
      :transition-hide="transition.hide"
      :transition-duration="s.animation === 'none' ? 0 : 300"
      @hide="onHide"
  >
    <div class="qwoo-popup__card" :class="widthClasses" :style="cardVars" role="dialog" :aria-label="current.name || undefined">
      <q-btn
          v-if="s.show_close !== false"
          v-close-popup
          flat
          round
          dense
          class="qwoo-popup__close"
          :style="closeStyle"
          :icon="matClose"
          :aria-label="t('Close')"
      />
      <SectionRenderer :sections="current.sections || []" page="popup" />
    </div>
  </q-dialog>
</template>

<script setup>
/**
 * The store's popups (Store builder → Popups): loads /config/popups.json in
 * the browser, arms the triggers of the popups allowed on this page
 * (utils/popups.js: who, where, how often, dates), and opens at most one by
 * itself per page view. Links with "#popup:{id}" open one whatever its rules
 * (clicks are caught before the router; an address with the hash opens it
 * too). In the Store builder's live preview, the popup being edited opens.
 */
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { matClose } from '@quasar/extras/material-icons'
import SectionRenderer from 'components/sections/SectionRenderer.vue'
import { isEditorMode, loadPageConfig, subscribeToLiveConfig } from 'src/utils/config-loader.js'
import { chromeTarget } from 'src/utils/layouts.js'
import { checkSession, useAccount } from 'src/composables/useAccount.js'
import { asResponsive, toCssLength } from 'src/composables/useSectionStyle.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { countView, markShown, mayOpenBySelf, popupIdOf } from 'src/utils/popups.js'
import { useI18n } from 'src/i18n/index.js'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { signedIn } = useAccount()

const popups = ref([])
const current = ref(null)
const shown = ref(false)
let previewId = ''

const s = computed(() => current.value?.settings || {})
const pos = computed(() => (['top', 'bottom', 'left', 'right'].includes(s.value.position) ? s.value.position : 'center'))
const qPosition = computed(() => (pos.value === 'center' ? 'standard' : pos.value))
const transition = computed(() => {
  const a = s.value.animation || 'auto'
  if (a === 'fade' || a === 'none') return { show: 'fade', hide: 'fade' }
  if (a === 'scale') return { show: 'scale', hide: 'scale' }
  const slide = { center: ['slide-up', 'slide-down'], top: ['slide-down', 'slide-up'], bottom: ['slide-up', 'slide-down'], left: ['slide-right', 'slide-left'], right: ['slide-left', 'slide-right'] }[pos.value]
  if (a === 'slide' || pos.value !== 'center') return { show: slide[0], hide: slide[1] }
  return { show: 'scale', hide: 'scale' }
})
const rootVars = computed(() => {
  const c = resolveGlobalColor(s.value.backdrop_color)
  return c ? { '--qp-backdrop': c } : {}
})
const widthClasses = computed(() => {
  const w = asResponsive(s.value.width)
  return { 'qp-w-d': !!w.desktop, 'qp-w-t': !!w.tablet, 'qp-w-m': !!w.mobile }
})
const cardVars = computed(() => {
  const v = {}
  const w = asResponsive(s.value.width)
  const maxw = asResponsive(s.value.max_width)
  for (const [device, suffix] of [['desktop', ''], ['tablet', '-t'], ['mobile', '-m']]) {
    const len = toCssLength(w[device])
    if (len) v[`--qp-w${suffix}`] = len
  }
  for (const [device, suffix] of [['desktop', ''], ['tablet', '-t'], ['mobile', '-m']]) {
    const len = toCssLength(maxw[device])
    if (len) v[`--qp-maxw${suffix}`] = len
  }
  if (s.value.radius) v['--qp-radius'] = toCssLength(s.value.radius)
  const bg = resolveGlobalColor(s.value.bg)
  if (bg) v['--qp-bg'] = bg
  return v
})
const closeStyle = computed(() => {
  const c = resolveGlobalColor(s.value.close_color)
  return c ? { color: c } : {}
})

function open(popup) {
  if (!popup) return
  current.value = popup
  shown.value = true
  markShown(popup.id)
}
function openById(id) {
  open(popups.value.find((p) => p.id === id))
}
function close() {
  shown.value = false
}
function onHide() {
  if (previewId) return
  current.value = null
}
// Blocks inside a popup can close it (a Sign In Form after signing in).
provide('qwooPopup', { close })

/* ---- Opening by itself: one per page view ---- */
let armed = []
let openedBySelf = false
function disarm() {
  for (const off of armed) off()
  armed = []
}
function fire(popup) {
  if (openedBySelf || shown.value) return
  openedBySelf = true
  disarm()
  open(popup)
}
async function arm() {
  disarm()
  openedBySelf = false
  if (previewId || !popups.value.length) return
  const views = countView()
  await checkSession() // "Show To" needs to know who this is
  const ctx = { where: chromeTarget(route), signedIn: signedIn.value, views }
  for (const popup of popups.value) {
    if (!mayOpenBySelf(popup, ctx)) continue
    const st = popup.settings
    if (st.trigger === 'load' || st.trigger === 'pages') {
      const timer = setTimeout(() => fire(popup), 800)
      armed.push(() => clearTimeout(timer))
    } else if (st.trigger === 'delay') {
      const timer = setTimeout(() => fire(popup), (Number(st.delay) || 5) * 1000)
      armed.push(() => clearTimeout(timer))
    } else if (st.trigger === 'scroll') {
      const want = Number(st.scroll) || 50
      const onScroll = () => {
        const room = document.documentElement.scrollHeight - window.innerHeight
        if (room <= 0 || (window.scrollY / room) * 100 >= want) fire(popup)
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      armed.push(() => window.removeEventListener('scroll', onScroll))
    } else if (st.trigger === 'exit') {
      const onOut = (e) => { if (!e.relatedTarget && e.clientY <= 0) fire(popup) }
      document.addEventListener('mouseout', onOut)
      armed.push(() => document.removeEventListener('mouseout', onOut))
    }
  }
}

/* ---- Links: "#popup:{id}" ---- */
function onClick(e) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const a = e.target?.closest?.('a[href*="#popup:"]')
  const id = a ? popupIdOf(a.getAttribute('href')) : ''
  if (!id || !popups.value.some((p) => p.id === id)) return
  // Before the router's own link handling (capture phase), so the address stays as it is.
  e.preventDefault()
  e.stopPropagation()
  openById(id)
}
function onOpenEvent(e) {
  openById(e.detail?.id)
}
function openFromHash() {
  const id = popupIdOf(route.hash)
  if (!id || !popups.value.some((p) => p.id === id)) return
  openById(id)
  router.replace({ path: route.path, query: route.query, hash: '' })
}

watch(() => route.path, () => {
  // A link inside a popup that goes to another page closes it.
  if (shown.value && !previewId) close()
  arm()
})
watch(() => route.hash, openFromHash)

let unsubscribe = () => {}
onMounted(async () => {
  document.addEventListener('click', onClick, true)
  window.addEventListener('qwoo:popup', onOpenEvent)
  unsubscribe = subscribeToLiveConfig('popups', (data) => {
    popups.value = Array.isArray(data?.popups) ? data.popups : []
    // The live preview: the popup being edited stays open.
    previewId = isEditorMode() ? String(data?.preview_popup || '') : ''
    if (previewId) {
      const p = popups.value.find((x) => x.id === previewId)
      if (p) { current.value = p; shown.value = true }
    } else if (isEditorMode()) {
      close()
    }
  })
  if (!isEditorMode()) {
    const config = await loadPageConfig('popups', false).catch(() => null)
    popups.value = Array.isArray(config?.popups) ? config.popups : []
    openFromHash()
    arm()
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onClick, true)
  window.removeEventListener('qwoo:popup', onOpenEvent)
  unsubscribe()
  disarm()
})
</script>

<style>
/* The page behind an open popup doesn't scroll. Quasar locks it by adding
   q-document--prevent-scroll to <html> and moving <body> up by the scroll
   (style.top); its own `body { position: fixed }` rule is missing from the
   build. Only while a popup is open: the drawers keep their behaviour. */
html.q-document--prevent-scroll:has(.qwoo-popup) { overscroll-behavior: none; }
html.q-document--prevent-scroll:has(.qwoo-popup) body { position: fixed !important; width: 100%; }
.qwoo-popup .q-dialog__backdrop { background: var(--qp-backdrop, rgba(0, 0, 0, .45)); }
/* Quasar's `.q-dialog__inner > div { pointer-events: all }` is missing from the
   build, so the card inherited `no-pointer-events` and every click inside it
   reached the backdrop (closing the popup). */
.qwoo-popup__card {
  pointer-events: all;
  position: relative;
  width: var(--qp-w-now, 560px);
  max-width: var(--qp-maxw-now, 100%);
  background: var(--qp-bg, var(--q-bg, #fff));
  border-radius: var(--qp-radius, 16px);
  box-shadow: 0 24px 60px rgba(0, 0, 0, .25);
  overflow: auto;
}
.qwoo-popup--top .qwoo-popup__card,
.qwoo-popup--bottom .qwoo-popup__card { width: var(--qp-w-now, 100vw); }
.qwoo-popup--left .qwoo-popup__card,
.qwoo-popup--right .qwoo-popup__card { width: var(--qp-w-now, 380px); height: 100vh; max-height: 100vh; }
.q-dialog__inner--maximized > .qwoo-popup__card { width: 100vw; height: 100vh; max-height: 100vh; border-radius: 0; }
.qwoo-popup__close {
  position: absolute;
  top: 8px;
  inset-inline-end: 8px;
  z-index: 2;
}
@media (min-width: 1024px) {
  .qp-w-d { --qp-w-now: var(--qp-w); --qp-maxw-now: var(--qp-maxw) }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .qp-w-t { --qp-w-now: var(--qp-w-t); --qp-maxw-now: var(--qp-maxw-t) }
}
@media (max-width: 767px) {
  .qp-w-m { --qp-w-now: var(--qp-w-m); --qp-maxw-now: var(--qp-maxw-m) }
}
</style>
