<template>
  <div class="a11y-ui">
    <div class="a11y-shade" aria-hidden="true" @click="emit('close')" />
    <div
        ref="panelEl"
        class="a11y-panel"
        :class="{ 'a11y-panel--sheet': sheet }"
        :style="panelStyle"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
    >
      <div class="a11y-head">
        <button v-if="view !== 'main'" type="button" class="a11y-icon-btn" :aria-label="t('Back')" @click="view = 'main'"><span class="a11y-flip" aria-hidden="true">‹</span></button>
        <h2 :id="titleId" class="a11y-title">
          <svg v-if="view === 'main'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4.2" r="2.2" /><path d="M4.5 7.6c2.3.7 4.8 1 7.5 1s5.2-.3 7.5-1l.5 1.9c-1.9.6-3.9.9-6 1.1v3.5l2.6 7.2-1.9.7L12 15.3 9.3 22l-1.9-.7L10 14.1v-3.5c-2.1-.2-4.1-.5-6-1.1z" /></svg>
          {{ view === 'map' ? t('Page map') : view === 'report' ? t('Report an accessibility problem') : t('Accessibility options') }}
        </h2>
        <button type="button" class="a11y-icon-btn" :aria-label="t('Close')" @click="emit('close')">✕</button>
      </div>

      <!-- The choices -->
      <div v-if="view === 'main'" class="a11y-body">
        <div v-if="has('profiles') && profiles.length" class="a11y-group">
          <h3>{{ t('Quick choice') }}</h3>
          <div class="a11y-profiles">
            <button v-for="p in profiles" :key="p.key" type="button" class="a11y-prof" :aria-pressed="profileOn(p) ? 'true' : 'false'" @click="toggleProfile(p)">{{ p.label }}</button>
          </div>
        </div>

        <div v-if="has('size') || has('spacing') || has('font') || has('align')" class="a11y-group">
          <h3>{{ t('Text') }}</h3>
          <div v-if="has('size')" class="a11y-size" role="group" :aria-label="t('Text size')">
            <button type="button" :aria-label="t('Smaller text')" :disabled="!prefs.size" @click="setSize(-1)">A−</button>
            <div class="a11y-size__lbl" aria-live="polite">
              {{ sizeNames[prefs.size || 0] }}
              <span class="a11y-dots" aria-hidden="true"><i v-for="n in 4" :key="n" :class="{ on: n - 1 <= (prefs.size || 0) }" /></span>
            </div>
            <button type="button" :aria-label="t('Bigger text')" :disabled="(prefs.size || 0) >= 3" @click="setSize(1)">A+</button>
          </div>
          <div class="a11y-tiles">
            <button v-if="has('spacing')" type="button" class="a11y-tile" :aria-pressed="on('spacing')" @click="flip('spacing')"><span class="a11y-ico" aria-hidden="true">↕</span>{{ t('Text spacing') }}</button>
            <button v-if="has('font')" type="button" class="a11y-tile" :aria-pressed="on('font')" @click="flip('font')"><span class="a11y-ico" aria-hidden="true">Aa</span>{{ t('Readable font') }}</button>
            <button v-if="has('align')" type="button" class="a11y-tile" :aria-pressed="on('align')" @click="flip('align')"><span class="a11y-ico" aria-hidden="true">☰</span>{{ rtl ? t('Align text right') : t('Align text left') }}</button>
          </div>
        </div>

        <div v-if="has('contrast') || has('gray')" class="a11y-group">
          <h3>{{ t('Colours') }}</h3>
          <div v-if="has('contrast')" class="a11y-seg" role="group" :aria-label="t('Contrast')">
            <button type="button" :aria-pressed="!prefs.contrast ? 'true' : 'false'" @click="set('contrast', '')"><span class="a11y-sw a11y-sw--normal" aria-hidden="true" />{{ t('Normal') }}</button>
            <button type="button" :aria-pressed="prefs.contrast === 'light' ? 'true' : 'false'" @click="set('contrast', 'light')"><span class="a11y-sw a11y-sw--light" aria-hidden="true" />{{ t('Light contrast') }}</button>
            <button type="button" :aria-pressed="prefs.contrast === 'dark' ? 'true' : 'false'" @click="set('contrast', 'dark')"><span class="a11y-sw a11y-sw--dark" aria-hidden="true" />{{ t('Dark contrast') }}</button>
          </div>
          <div v-if="has('gray')" class="a11y-tiles">
            <button type="button" class="a11y-tile" :aria-pressed="on('gray')" @click="flip('gray')"><span class="a11y-ico" aria-hidden="true">◐</span>{{ t('Grayscale') }}</button>
          </div>
        </div>

        <div v-if="has('links') || has('headings')" class="a11y-group">
          <h3>{{ t('Highlight') }}</h3>
          <div class="a11y-tiles">
            <button v-if="has('links')" type="button" class="a11y-tile" :aria-pressed="on('links')" @click="flip('links')"><span class="a11y-ico" aria-hidden="true">🔗︎</span>{{ t('Highlight links') }}</button>
            <button v-if="has('headings')" type="button" class="a11y-tile" :aria-pressed="on('headings')" @click="flip('headings')"><span class="a11y-ico" aria-hidden="true">H</span>{{ t('Highlight headings') }}</button>
          </div>
        </div>

        <div v-if="has('motion') || has('cursor') || has('reading')" class="a11y-group">
          <h3>{{ t('Motion and reading') }}</h3>
          <div class="a11y-tiles">
            <button v-if="has('motion')" type="button" class="a11y-tile" :aria-pressed="on('motion')" @click="flip('motion')"><span class="a11y-ico" aria-hidden="true">⏸︎</span>{{ t('Stop animations') }}</button>
            <button v-if="has('cursor')" type="button" class="a11y-tile" :aria-pressed="on('cursor')" @click="flip('cursor')"><span class="a11y-ico" aria-hidden="true">➤</span>{{ t('Big cursor') }}</button>
            <button v-if="has('reading')" type="button" class="a11y-tile" :aria-pressed="on('guide')" @click="flip('guide')"><span class="a11y-ico" aria-hidden="true">―</span>{{ t('Reading guide') }}</button>
            <button v-if="has('reading')" type="button" class="a11y-tile" :aria-pressed="on('mask')" @click="flip('mask')"><span class="a11y-ico" aria-hidden="true">▤</span>{{ t('Reading mask') }}</button>
          </div>
        </div>

        <button v-if="has('map')" type="button" class="a11y-tile a11y-wide" @click="openMap"><span class="a11y-ico" aria-hidden="true">≡</span>{{ t('Page map: headings and areas') }}</button>
      </div>

      <!-- Page map: the page's real headings and areas -->
      <div v-else-if="view === 'map'" class="a11y-body">
        <p v-if="!mapItems.length" class="a11y-small">{{ t('This page has no headings.') }}</p>
        <ul v-else class="a11y-map">
          <li v-for="(m, i) in mapItems" :key="i"><button type="button" :class="`lv${m.level}`" @click="jump(m.el)"><span class="a11y-small">{{ m.kind }}</span> {{ m.text }}</button></li>
        </ul>
      </div>

      <!-- Report a problem -->
      <form v-else class="a11y-body" @submit.prevent="send">
        <template v-if="!sent">
          <label class="a11y-field" :for="ids.what">{{ t('What didn\'t work?') }}
            <textarea :id="ids.what" v-model="report.message" rows="4" maxlength="3000" required />
          </label>
          <label class="a11y-field" :for="ids.email">{{ t('Email for our answer') }}
            <input :id="ids.email" v-model="report.email" type="email" autocomplete="email" required>
          </label>
          <label class="a11y-field" :for="ids.phone">{{ t('Phone (optional)') }}
            <input :id="ids.phone" v-model="report.phone" type="tel" autocomplete="tel" maxlength="40">
          </label>
          <input v-model="report.website" class="a11y-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <p class="a11y-small">{{ t('The address of this page is sent with your report.') }}<template v-if="contactLine">{{ ' ' + contactLine }}</template></p>
          <p v-if="error" class="a11y-error" role="alert">{{ error }}</p>
          <button type="submit" class="a11y-go" :disabled="busy">{{ busy ? t('Sending…') : t('Send') }}</button>
        </template>
        <p v-else class="a11y-done" role="status">{{ t('Thank you. The store got your report and will get back to you.') }}</p>
      </form>

      <div v-if="view === 'main'" class="a11y-foot">
        <div class="a11y-links">
          <router-link :to="statementPath" class="a11y-link" @click="emit('close')">{{ t('Accessibility statement') }}</router-link>
          <button type="button" class="a11y-link" @click="view = 'report'">{{ t('Report a problem') }}</button>
          <button type="button" class="a11y-link" :disabled="!anyOn" @click="resetAll">{{ t('Reset all') }}</button>
          <button v-if="dockHasMoved()" type="button" class="a11y-link" @click="dockReset()">{{ t('Put the floating buttons back') }}</button>
        </div>
        <p class="a11y-small">{{ t('Your choices are saved on this device only. This menu is on top of the site\'s own accessibility, never instead of it.') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * The accessibility tool's panel (A11yButton.vue opens it). A real dialog: focus inside, Tab stays
 * in, Escape closes, focus goes back to the button. Phones: a sheet from the bottom; wider screens:
 * a panel above the button. Every switch is a button with aria-pressed.
 */
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useI18n } from 'src/i18n/index.js'
import { localPath } from 'src/i18n/lang.js'
import { trapFocus } from 'src/utils/focus-trap.js'
import { emptyPrefs } from 'src/utils/a11y-prefs.js'
import { dockHasMoved, dockReset } from 'src/utils/floating-dock.js'
import { fetchWithToken } from 'src/composables/useApiFetch.js'
import { onColor } from 'src/utils/on-color.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  cfg: { type: Object, required: true },
  prefs: { type: Object, required: true },
  side: { type: String, default: 'left' },
  color: { type: String, default: '' },
})
const emit = defineEmits(['close', 'change'])
const { t } = useI18n()

const uid = Math.random().toString(36).slice(2, 8)
const titleId = `a11y-title-${uid}`
const ids = { what: `a11y-what-${uid}`, email: `a11y-email-${uid}`, phone: `a11y-phone-${uid}` }
const panelEl = ref(null)
const view = ref('main')
const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
const sheet = ref(typeof window !== 'undefined' && window.innerWidth < 600)

const has = (f) => !props.cfg.off.includes(f)
const on = (k) => (props.prefs[k] ? 'true' : 'false')
const sizeNames = computed(() => [t('Normal size'), t('Big'), t('Bigger'), t('Biggest')])
const anyOn = computed(() => Object.entries(props.prefs).some(([, v]) => !!v))
const statementPath = computed(() => localPath('/accessibility-statement'))

function update(patch) {
  emit('change', { ...props.prefs, ...patch })
}
const flip = (k) => update({ [k]: !props.prefs[k] })
const set = (k, v) => update({ [k]: v })
const setSize = (d) => update({ size: Math.max(0, Math.min(3, (props.prefs.size || 0) + d)) })
const resetAll = () => emit('change', emptyPrefs())

/* Profiles: each only a set of the switches above (and only the ones the owner kept). */
const profiles = computed(() => [
  { key: 'seizure', label: t('Seizure safe'), set: { motion: true, gray: true } },
  { key: 'vision', label: t('Low vision'), set: { size: 2, contrast: 'light', cursor: true, links: true } },
  { key: 'focus', label: t('Focus and attention'), set: { motion: true, mask: true, font: true } },
].map((p) => {
  const need = { motion: 'motion', gray: 'gray', size: 'size', contrast: 'contrast', cursor: 'cursor', links: 'links', mask: 'reading', font: 'font' }
  const set = Object.fromEntries(Object.entries(p.set).filter(([k]) => has(need[k])))
  return { ...p, set }
}).filter((p) => Object.keys(p.set).length))
const profileOn = (p) => Object.entries(p.set).every(([k, v]) => props.prefs[k] === v)
function toggleProfile(p) {
  const off = profileOn(p)
  const patch = {}
  for (const [k, v] of Object.entries(p.set)) patch[k] = off ? (typeof v === 'number' ? 0 : typeof v === 'string' ? '' : false) : v
  update(patch)
}

/* ---------- page map ---------- */
const mapItems = ref([])
function openMap() {
  const list = []
  const main = document.getElementById('main-content') || document.body
  const header = document.querySelector('header')
  if (header) list.push({ level: 1, kind: t('Area'), text: t('Top of the page'), el: header })
  for (const h of main.querySelectorAll('h1, h2, h3')) {
    const text = h.textContent.replace(/\s+/g, ' ').trim()
    const r = h.getBoundingClientRect()
    if (!text || (!r.width && !r.height) || h.closest('[aria-hidden="true"], .a11y-ui')) continue
    list.push({ level: +h.tagName[1], kind: h.tagName === 'H1' ? t('Main heading') : t('Heading'), text: text.slice(0, 90), el: h })
  }
  const footer = document.querySelector('footer')
  if (footer) list.push({ level: 1, kind: t('Area'), text: t('Bottom of the page'), el: footer })
  mapItems.value = list
  view.value = 'map'
}
function jump(el) {
  emit('close')
  nextTick(() => {
    el.scrollIntoView({ block: 'start' })
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
    el.focus({ preventScroll: true })
  })
}

/* ---------- report ---------- */
const report = reactive({ message: '', email: '', phone: '', website: '' })
const busy = ref(false)
const sent = ref(false)
const error = ref('')
const contactLine = computed(() => {
  const c = props.cfg.contact || {}
  if (!c.name && !c.phone) return ''
  return t('Accessibility coordinator: {who}', { who: [c.name, c.phone].filter(Boolean).join(', ') })
})
async function send() {
  error.value = ''
  busy.value = true
  try {
    const res = await fetchWithToken('/wp-json/qwoo/v1/a11y/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...report, page: location.pathname }),
    }, null, { skipNonceRetry: true })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data?.ok) sent.value = true
    else error.value = data?.message || t('We couldn\'t send it. Please try again.')
  } catch {
    error.value = t('We couldn\'t send it. Please try again.')
  }
  busy.value = false
}

/* ---------- place and focus ---------- */
const ink = computed(() => onColor(props.color) || '#fff')
const panelStyle = computed(() => (sheet.value
  ? { '--a11y-color': props.color, '--a11y-ink': ink.value }
  : { '--a11y-color': props.color, '--a11y-ink': ink.value, [props.side]: 'calc(16px + env(safe-area-inset-' + props.side + ', 0px))' }))

let release = null
watch(() => props.open, (isOpen) => {
  release?.()
  release = null
  if (!isOpen) {
    view.value = 'main'
    sent.value = false
    return
  }
  sheet.value = window.innerWidth < 600
  const opener = document.activeElement
  nextTick(() => {
    if (panelEl.value) release = trapFocus(panelEl.value, { returnTo: opener, onEscape: () => emit('close') })
  })
}, { immediate: true })
watch(view, () => nextTick(() => panelEl.value?.querySelector('.a11y-body button, .a11y-body textarea')?.focus()))
onBeforeUnmount(() => release?.({ restore: false }))
</script>

<style scoped>
.a11y-shade { position: fixed; inset: 0; z-index: 2550; background: rgba(0, 0, 0, .3); }
.a11y-panel {
  position: fixed;
  z-index: 2560;
  bottom: 84px;
  width: min(390px, calc(100vw - 32px));
  max-height: calc(100vh - 110px);
  max-height: calc(100dvh - 110px);
  display: flex;
  flex-direction: column;
  background: #fff;
  color: #17201c;
  border-radius: 18px;
  box-shadow: 0 16px 50px rgba(0, 0, 0, .3);
  font-family: Arial, "Segoe UI", system-ui, -apple-system, sans-serif;
  font-size: 15px;
  line-height: 1.45;
  text-align: start;
  outline: none;
}
.a11y-panel--sheet {
  inset-inline: 0;
  bottom: 0;
  width: 100%;
  max-height: 88vh;
  max-height: 88dvh;
  border-radius: 18px 18px 0 0;
}
.a11y-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px 10px; border-bottom: 1px solid #e3e7e5; }
.a11y-title { flex: 1; display: flex; align-items: center; gap: 8px; margin: 0; font-size: 18px; font-weight: 700; color: #17201c; line-height: 1.3; letter-spacing: 0; }
.a11y-title svg { width: 24px; height: 24px; flex: none; color: var(--a11y-color); }
.a11y-icon-btn { width: 44px; height: 44px; flex: none; border: 0; border-radius: 50%; background: #eff2f1; color: #17201c; font-size: 18px; cursor: pointer; }
.a11y-flip { display: inline-block; font-size: 24px; line-height: 1; }
[dir="rtl"] .a11y-flip { transform: scaleX(-1); }
.a11y-body { overflow-y: auto; padding: 12px 14px; display: grid; gap: 14px; }
.a11y-group h3 { margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #4d5a54; letter-spacing: 0; line-height: 1.3; }
.a11y-profiles { display: flex; flex-wrap: wrap; gap: 8px; }
.a11y-prof { min-height: 44px; padding: 8px 14px; border: 1.5px solid #c9d2cd; border-radius: 99px; background: #fff; color: #17201c; font: inherit; font-size: 14px; cursor: pointer; }
.a11y-prof[aria-pressed="true"] { background: var(--a11y-color); border-color: var(--a11y-color); color: var(--a11y-ink, #fff); }
.a11y-size { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border: 1.5px solid #dfe5e2; border-radius: 12px; background: #f6f8f7; }
.a11y-size button { width: 44px; height: 44px; border: 0; border-radius: 10px; background: #fff; color: #17201c; box-shadow: 0 1px 3px rgba(0, 0, 0, .15); font: inherit; font-weight: 700; cursor: pointer; }
.a11y-size button:disabled { opacity: .4; cursor: default; }
.a11y-size__lbl { flex: 1; text-align: center; font-size: 14px; }
.a11y-dots { display: flex; justify-content: center; gap: 5px; margin-top: 3px; }
.a11y-dots i { width: 7px; height: 7px; border-radius: 50%; background: #c9d2cd; }
.a11y-dots i.on { background: var(--a11y-color); }
.a11y-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
.a11y-group > .a11y-tiles:first-of-type:not(:nth-child(3)) { margin-top: 0; }
.a11y-tile { display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 8px 10px; border: 1.5px solid #dfe5e2; border-radius: 12px; background: #f6f8f7; color: #17201c; font: inherit; font-size: 14px; text-align: start; cursor: pointer; }
.a11y-tile[aria-pressed="true"] { border-color: var(--a11y-color); background: #edf5f1; box-shadow: inset 0 0 0 1px var(--a11y-color); }
.a11y-tile[aria-pressed="true"]::after { content: '✓'; margin-inline-start: auto; font-weight: 700; color: var(--a11y-color); }
.a11y-ico { width: 24px; flex: none; text-align: center; font-size: 17px; font-weight: 700; color: #3a4943; }
.a11y-wide { width: 100%; }
.a11y-seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.a11y-seg button { min-height: 52px; padding: 6px 4px; border: 1.5px solid #dfe5e2; border-radius: 10px; background: #f6f8f7; color: #17201c; font: inherit; font-size: 13.5px; cursor: pointer; }
.a11y-seg button[aria-pressed="true"] { border-color: var(--a11y-color); background: #edf5f1; font-weight: 700; }
.a11y-sw { display: block; width: 70%; height: 12px; margin: 0 auto 4px; border: 1px solid #999; border-radius: 4px; }
.a11y-sw--normal { background: linear-gradient(90deg, #e5efe6, #c98a5b); }
.a11y-sw--light { background: #fff; border-color: #000; }
.a11y-sw--dark { background: #000; border-color: #000; }
.a11y-map { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.a11y-map button { width: 100%; min-height: 44px; padding: 8px 12px; border: 1px solid #dfe5e2; border-radius: 10px; background: #f6f8f7; color: #17201c; font: inherit; text-align: start; cursor: pointer; }
.a11y-map .lv3 { padding-inline-start: 26px; }
.a11y-field { display: grid; gap: 4px; font-size: 14px; font-weight: 700; }
.a11y-field textarea, .a11y-field input { padding: 10px; border: 1.5px solid #b9c4be; border-radius: 10px; background: #fff; color: #17201c; font: inherit; font-weight: 400; }
.a11y-hp { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.a11y-go { min-height: 48px; border: 0; border-radius: 10px; background: var(--a11y-color); color: var(--a11y-ink, #fff); font: inherit; font-weight: 700; cursor: pointer; }
.a11y-go:disabled { opacity: .6; }
.a11y-error { margin: 0; color: #b3261e; font-size: 14px; }
.a11y-done { margin: 8px 0; font-size: 16px; }
.a11y-foot { display: grid; gap: 8px; padding: 10px 14px calc(12px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid #e3e7e5; }
.a11y-links { display: flex; flex-wrap: wrap; gap: 8px; }
.a11y-link { flex: 1 1 110px; display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 6px 10px; border: 1.5px solid #c9d2cd; border-radius: 10px; background: #fff; color: #17201c; font: inherit; font-size: 14px; text-decoration: none; text-align: center; cursor: pointer; }
.a11y-link:disabled { opacity: .45; cursor: default; }
.a11y-small { margin: 0; font-size: 12.5px; color: #4d5a54; font-weight: 400; }
.a11y-panel :focus-visible { outline: 3px solid #0a3d2c; outline-offset: 2px; }
</style>
