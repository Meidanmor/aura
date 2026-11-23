<template>
  <div v-if="view || fabShown" class="ckb-root" :class="{ 'ckb-sys': d.font === 'system' }" :style="vars">
    <transition name="fade">
      <div v-if="view && dimmed" class="ckb-dim" aria-hidden="true" />
    </transition>
    <transition name="fade">
      <!-- The banner (what shoppers see first). -->
      <div v-if="view === 'banner'" class="ckb ckb-banner" :class="bannerClass" role="dialog" :aria-label="title || t('Cookies')" aria-live="polite">
        <div class="ckb-body">
          <div v-if="title && d.show_title" class="ckb-title">{{ title }}</div>
          <div class="ckb-text">
            {{ text }}
            <router-link v-if="privacyPath && d.show_policy" :to="privacyPath" class="ckb-link">{{ own.policy || t('Privacy') }}</router-link>
          </div>
        </div>
        <div class="ckb-acts">
          <!-- No analytics or marketing code: nothing to choose, one button. -->
          <template v-if="!asks">
            <button type="button" class="ckb-btn ckb-yes" @click="noticeSeen">{{ own.accept || t('OK') }}</button>
          </template>
          <template v-else-if="mode === 'notice'">
            <button type="button" class="ckb-btn ckb-pick" @click="choose">{{ own.choose || t('Choose') }}</button>
            <button type="button" class="ckb-btn ckb-yes" @click="done({ analytics: true, marketing: true })">{{ own.accept || t('OK') }}</button>
          </template>
          <template v-else>
            <button type="button" class="ckb-btn ckb-pick" @click="choose">{{ own.choose || t('Choose') }}</button>
            <!-- Saying no is as easy as saying yes ("Accept and Reject look the same", on by default). -->
            <button type="button" class="ckb-btn" :class="d.equal ? 'ckb-yes' : 'ckb-no'" @click="done({ analytics: false, marketing: false })">{{ own.reject || t('Reject all') }}</button>
            <button type="button" class="ckb-btn ckb-yes" @click="done({ analytics: true, marketing: true })">{{ own.accept || t('Accept all') }}</button>
          </template>
        </div>
      </div>
    </transition>
    <transition name="fade">
      <!-- The choices window ("Choose", the cookie button, any #cookie-settings link). -->
      <div v-if="view === 'prefs'" class="ckb ckb-prefs" :class="prefsClass" role="dialog" :aria-label="own.ptitle || t('Your cookie choices')">
        <div class="ckb-title">{{ own.ptitle || t('Your cookie choices') }}</div>
        <div class="ckb-groups">
          <label class="ckb-group">
            <span><b>{{ own.nec || t('Necessary') }}</b><small v-if="d.prefs_desc">{{ own.necd || t('Needed for the store to work: your cart, signing in, checkout.') }}</small></span>
            <input type="checkbox" checked disabled role="switch">
          </label>
          <label class="ckb-group">
            <span><b>{{ own.ana || t('Analytics') }}</b><small v-if="d.prefs_desc">{{ own.anad || (cfg?.audiences ? t('Helps the store see how it\'s used and show you products you\'ll like.') : t('Helps the store see how it\'s used.')) }}</small></span>
            <input v-model="picked.analytics" type="checkbox" role="switch">
          </label>
          <label class="ckb-group">
            <span><b>{{ own.mkt || t('Marketing') }}</b><small v-if="d.prefs_desc">{{ own.mktd || t('Lets the store measure its ads and show you relevant ones.') }}</small></span>
            <input v-model="picked.marketing" type="checkbox" role="switch">
          </label>
        </div>
        <div class="ckb-acts">
          <button type="button" class="ckb-btn ckb-yes" @click="done(picked)">{{ own.save || t('Save my choice') }}</button>
          <button type="button" class="ckb-btn" :class="d.equal ? 'ckb-yes' : 'ckb-no'" @click="done({ analytics: true, marketing: true })">{{ own.accept || t('Accept all') }}</button>
        </div>
        <p v-if="choiceId" class="ckb-id">{{ t('Choice ID {id}', { id: choiceId }) }}</p>
      </div>
    </transition>
    <!-- The cookie button: changes the choice later. -->
    <!-- Placed by the floating buttons layout (Store builder → Floating buttons; floating-dock.js). -->
    <button v-if="fabShown && fabPlace" ref="fabEl" type="button" class="ckb-fab" :class="{ 'ckb-fab--pill': d.fab_shape === 'pill', 'dock-movable': fabMovable }" :style="fabPlace" data-dock :aria-label="own.fab || t('Cookie choices')" @pointerdown="fabDrag.down($event, fabEl)" @click.capture="fabDrag.click" @contextmenu="fabMovable && $event.preventDefault()" @click="reopen">
      <svg v-if="d.fab_icon === 'shield'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></svg>
      <svg v-else-if="d.fab_icon === 'sliders'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9 3 3 0 0 1-3-3 3 3 0 0 1-3-3 3 3 0 0 1-3-3z" /><path d="M8.5 11.5h.01M12 16h.01M15.5 13h.01M9 15.5h.01" /></svg>
      <span v-if="d.fab_shape === 'pill'">{{ own.fab || t('Cookies') }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { dock, dockDrag, dockShow, dockStyle } from 'src/utils/floating-dock.js'
import { loadPageConfig } from 'src/utils/config-loader.js'
import { allowedNow, codeConfig, consentChoice, logConsent, saveConsent } from 'src/utils/custom-code.js'
import { currentLang } from 'src/i18n/lang.js'
import { useI18n } from 'src/i18n/index.js'

/**
 * The cookie banner (dashboard → Settings → Cookie banner): the banner, the choices window and
 * the cookie button, each in the owner's design (layout, colours, corners, font, texts per
 * language). With analytics or marketing code: "Ask first": nothing of that runs before the
 * shopper agrees (Accept all / Reject all / Choose), and the banner always shows; "Notice only":
 * it runs, and the shopper can turn it off. The choice lasts 6 or 12 months, carries a random
 * choice ID and the banner version (a newer version asks again), and goes to the store's record
 * (custom-code.js logConsent). Without such code: a notice with one button (kept in localStorage
 * cookie_consent), so a later "ask" store still asks. "Show a cookie banner" off hides it, except
 * for "Ask first" with code. "#cookie-settings" links and the cookie button open the choices.
 */
const { t } = useI18n()
const cfg = codeConfig()
const asks = !!cfg?.ask
const mode = cfg?.mode === 'notice' ? 'notice' : 'ask'
const d = cfg?.design || { layout: 'bar', corner: 'start', show_title: true, show_policy: true, equal: true, prefs_layout: 'center', prefs_desc: true, fab: false }
const own = computed(() => cfg?.texts?.[currentLang()] || {})
// Owner's switch (stores without settings: on). "Ask first" with code needs the banner.
const shown = (asks && mode === 'ask') || cfg?.banner !== false
// The store sends title and message (maybe empty on purpose); without them, the built-in ones.
const ownText = (key, fallback) => (Object.prototype.hasOwnProperty.call(own.value, key) ? String(own.value[key] || '') : fallback())

const view = ref('') // '' | 'banner' | 'prefs'
const chosen = ref(!!consentChoice())
const picked = reactive({ analytics: false, marketing: false })
const privacyPath = ref('')
const choiceId = computed(() => (chosen.value ? consentChoice()?.cid || '' : ''))

const title = computed(() => ownText('title', () => t('We use cookies')))
const text = computed(() => ownText('text', () => (!asks
  ? t('We use cookies to run the store and to improve your experience.')
  : mode === 'notice'
    ? t('We use cookies to run the store, see how it\'s used and measure our ads. You can turn them off.')
    : t('We use cookies to run the store. With your permission, we also use them to see how the store is used and to measure our ads.'))))

const vars = computed(() => {
  const v = {
    '--ckb-r': `${d.radius ?? 18}px`,
    '--ckb-btn-r': `${d.btn_radius ?? 10}px`,
    '--ckb-fs': `${d.size ?? 14}px`,
    '--ckb-fab-s': `${d.fab_size ?? 44}px`,
  }
  if (d.bg) v['--ckb-bg'] = d.bg
  if (d.ink) v['--ckb-ink'] = d.ink
  if (d.accent) v['--ckb-accent'] = d.accent
  if (d.fab_bg) v['--ckb-fab-bg'] = d.fab_bg
  if (d.fab_ink) v['--ckb-fab-ink'] = d.fab_ink
  return v
})
const place = (layout) => (layout === 'box' ? `ckb--box ckb--${d.corner || 'start'}` : `ckb--${layout || 'bar'}`)
const bannerClass = computed(() => place(d.layout))
const prefsClass = computed(() => place(d.prefs_layout))
const dimmed = computed(() => view.value === 'prefs' ? d.prefs_layout === 'center' : (d.dim || d.layout === 'center'))
const fabShown = computed(() => !view.value && asks && chosen.value && d.fab !== false)
const fabEl = ref(null)
const fabPlace = computed(() => dockStyle('cookie'))
const fabMovable = computed(() => !!dock.cfg.buttons.cookie?.move)
const fabDrag = dockDrag('cookie')
watch(fabShown, (on) => dockShow('cookie', on), { immediate: true })

const PRIVACY_PATHS = ['privacy-policy', 'privacy']
async function findPrivacyPage() {
  if (privacyPath.value) return
  try {
    const list = (await loadPageConfig('pages', false))?.pages || []
    const page = list.find((p) => p.role === 'privacy') || list.find((p) => PRIVACY_PATHS.includes(p.path || p.slug))
    if (page) privacyPath.value = '/' + (page.path || page.slug)
  } catch { /* no link then */ }
}

function choose() {
  const now = allowedNow()
  picked.analytics = !!now.analytics
  picked.marketing = !!now.marketing
  view.value = 'prefs'
}

const NOTICE_KEY = 'cookie_consent'
function noticeSeen() {
  try { localStorage.setItem(NOTICE_KEY, 'accepted') } catch { /* private mode */ }
  view.value = ''
}

function done(next) {
  saveConsent({ analytics: !!next.analytics, marketing: !!next.marketing })
  chosen.value = true
  view.value = ''
}

// "Cookie settings" and the cookie button: the choices, with what's allowed now.
function reopen() {
  if (!asks) return
  choose()
  findPrivacyPage()
}

// One "shown" per visit for the store's numbers.
function countShown() {
  try {
    if (sessionStorage.getItem('qwoo_ck_shown')) return
    sessionStorage.setItem('qwoo_ck_shown', '1')
  } catch { /* private mode: count it */ }
  logConsent({ event: 'shown' })
}

function onKey(e) {
  if (e.key === 'Escape' && view.value === 'prefs' && chosen.value) view.value = ''
}

onMounted(() => {
  if (asks) window.addEventListener('qwoo:consent-open', reopen)
  window.addEventListener('keydown', onKey)
  if (!shown) return
  if (asks) {
    if (consentChoice()) return
  } else {
    let seen = null
    try { seen = localStorage.getItem(NOTICE_KEY) } catch { /* private mode */ }
    if (seen) return
  }
  view.value = 'banner'
  if (asks) countShown()
  findPrivacyPage()
})
onUnmounted(() => {
  window.removeEventListener('qwoo:consent-open', reopen)
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.ckb-root {
  --ckb-bg-now: var(--ckb-bg, #fff);
  --ckb-ink-now: var(--ckb-ink, #111);
  --ckb-accent-now: var(--ckb-accent, var(--q-secondary, #333));
  font-size: var(--ckb-fs, 14px);
}
.ckb-sys { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.ckb-dim { position: fixed; inset: 0; z-index: 9998; background: rgba(0, 0, 0, .45); }
.ckb {
  position: fixed; z-index: 9999; box-sizing: border-box;
  background: var(--ckb-bg-now); color: var(--ckb-ink-now);
  border-radius: var(--ckb-r, 18px); box-shadow: 0 10px 30px rgba(0, 0, 0, .16);
  padding: 18px 22px; display: flex; gap: 14px; flex-wrap: wrap; align-items: center;
  max-height: calc(100vh - 24px); max-height: calc(100dvh - 24px); overflow: auto; overscroll-behavior: contain;
}
.ckb--bar { inset-inline: 16px; bottom: 16px; max-width: 980px; margin-inline: auto; justify-content: space-between; }
.ckb--box { bottom: 16px; width: min(380px, calc(100vw - 32px)); flex-direction: column; align-items: stretch; }
.ckb--box.ckb--start { inset-inline-start: 16px; }
.ckb--box.ckb--end { inset-inline-end: 16px; }
.ckb--center { top: 50%; inset-inline: 0; margin-inline: auto; transform: translateY(-50%); width: min(460px, calc(100vw - 32px)); flex-direction: column; align-items: stretch; }
.ckb-prefs { flex-direction: column; align-items: stretch; }
.ckb-prefs.ckb--bar { inset-inline: 0; bottom: 0; border-end-start-radius: 0; border-end-end-radius: 0; max-width: 640px; }
.ckb-body { flex: 1; min-width: 220px; }
.ckb-title { font-weight: 700; font-size: 1.1em; margin-bottom: 4px; }
.ckb-text { line-height: 1.45; }
.ckb-link { margin-inline-start: 6px; color: inherit; text-decoration: underline; }
.ckb-acts { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.ckb--box .ckb-acts, .ckb--center .ckb-acts, .ckb-prefs .ckb-acts { justify-content: flex-end; }
.ckb-btn { font: inherit; font-weight: 600; cursor: pointer; padding: 9px 16px; border-radius: var(--ckb-btn-r, 10px); border: 1.5px solid var(--ckb-accent-now); line-height: 1.2; }
.ckb-yes { background: var(--ckb-accent-now); color: #fff; }
.ckb-no { background: transparent; color: var(--ckb-ink-now); }
.ckb-pick { background: transparent; color: var(--ckb-ink-now); border-color: transparent; text-decoration: underline; padding-inline: 6px; }
.ckb-btn:focus-visible, .ckb-fab:focus-visible { outline: 2px solid var(--ckb-accent-now); outline-offset: 2px; }
.ckb-groups { display: grid; gap: 8px; margin: 6px 0 4px; }
.ckb-group { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border-radius: 10px; border: 1px solid color-mix(in srgb, var(--ckb-ink-now) 15%, transparent); cursor: pointer; }
.ckb-group span { display: grid; gap: 2px; }
.ckb-group small { font-size: .88em; opacity: .75; }
.ckb-group input { appearance: none; -webkit-appearance: none; flex: none; width: 38px; height: 22px; border-radius: 999px; margin: 0; cursor: pointer; position: relative; background: color-mix(in srgb, var(--ckb-ink-now) 25%, transparent); transition: background .15s; }
.ckb-group input::after { content: ""; position: absolute; top: 3px; inset-inline-start: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: inset-inline-start .15s; }
.ckb-group input:checked { background: var(--ckb-accent-now); }
.ckb-group input:checked::after { inset-inline-start: 19px; }
.ckb-group input:disabled { opacity: .6; cursor: default; }
.ckb-id { margin: 0; font-size: .8em; opacity: .6; font-variant-numeric: tabular-nums; }
.ckb-fab {
  width: var(--dock-size, 52px); height: var(--dock-size, 52px);
  border-radius: 50%; border: 0; cursor: pointer; display: grid; place-items: center; padding: 0;
  background: var(--ckb-fab-bg, var(--ckb-ink-now)); color: var(--ckb-fab-ink, var(--ckb-bg-now)); box-shadow: 0 6px 18px rgba(0, 0, 0, .2);
}
.ckb-fab svg { width: 55%; height: 55%; }
.ckb-fab--pill { width: auto; border-radius: 999px; padding: 0 14px; display: flex; gap: 6px; font-family: inherit; font-weight: 600; font-size: 13px; }
.ckb-fab--pill svg { width: 18px; height: 18px; }
@media (max-width: 600px) {
  .ckb { padding: 14px 16px; }
  .ckb--bar { inset-inline: 8px; bottom: 8px; }
  .ckb-body { min-width: 0; flex-basis: 100%; }
  .ckb--bar .ckb-acts { width: 100%; justify-content: flex-end; }
}
@media (prefers-reduced-motion: reduce) { .ckb-group input, .ckb-group input::after { transition: none; } }
</style>
