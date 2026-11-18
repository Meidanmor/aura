<template>
  <Teleport to="body">
    <div v-if="install.guide" class="ig-shade" @click.self="closeGuide">
      <div
          class="ig-card"
          :class="`is-${place}`"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ig-title"
          @keydown.esc="closeGuide"
      >
        <div class="ig-head">
          <img v-if="icon" :src="icon" alt="" class="ig-icon" width="40" height="40">
          <div class="ig-head-text">
            <div id="ig-title" class="ig-title">{{ title }}</div>
            <div class="ig-sub">{{ sub }}</div>
          </div>
          <button ref="closeBtn" type="button" class="ig-x" :aria-label="t('Close')" @click="closeGuide">×</button>
        </div>
        <ol class="ig-steps" :style="{ '--n': steps.length }">
          <li v-for="(s, i) in steps" :key="i" class="ig-step">
            <span class="ig-num">{{ i + 1 }}</span>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span class="ig-ico" aria-hidden="true" v-html="ICONS[s.icon]" />
            <span>{{ s.text }}</span>
          </li>
        </ol>
        <div v-if="after" class="ig-after">{{ after }}</div>
      </div>
      <!-- Points at the browser's own button. Physical sides on purpose: browser buttons don't flip in RTL. -->
      <div v-if="arrow" class="ig-arrow" :class="{ up: arrow.up }" :style="arrow.style" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="36" height="36"><path fill="currentColor" d="M12 22l-8-9h5V2h6v11h5z" /></svg>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { install, closeGuide, device, markForBrowser } from 'src/services/install.js'
import { t } from 'src/i18n/index.js'
import { storeName } from 'src/utils/site-info.js'

/**
 * The "add to home screen" steps (opened by InstallAsk / the sold-out form). On iPhone the
 * card sits where Safari's own menus don't reach and lists every step, because once a Safari
 * menu is open our page is under it: the arrow only points at the first button.
 */

const ICONS = {
  dots: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>',
  vdots: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5v10h14V11h-1"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>',
  add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
  browser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z" fill="currentColor"/></svg>',
}

const d = device()
const ipad = typeof navigator !== 'undefined' && (/iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1))
const icon = '/icons/icon-128x128.png'
const name = computed(() => storeName() || t('the store'))

/** Which browser layout: decides the steps, where the card sits and where the arrow points. */
const kind = computed(() => {
  if (d.os === 'android') return d.browser === 'inapp' ? 'inapp' : 'android'
  if (d.browser === 'inapp') return 'inapp'
  if (d.browser === 'chrome') return 'chrome'
  if (d.browser === 'safari') return ipad ? 'ipad' : d.safari >= 26 ? 'safari26' : 'safari'
  return 'other'
})

const steps = computed(() => {
  switch (kind.value) {
    case 'safari26': return [{ icon: 'dots', text: t('Tap •••') }, { icon: 'share', text: t('Share') }, { icon: 'more', text: t('View More') }, { icon: 'add', text: t('Add to Home Screen') }]
    case 'safari':
    case 'ipad': return [{ icon: 'share', text: t('Tap Share') }, { icon: 'more', text: t('Scroll down') }, { icon: 'add', text: t('Add to Home Screen') }]
    case 'chrome': return [{ icon: 'share', text: t('Tap Share') }, { icon: 'more', text: t('More') }, { icon: 'add', text: t('Add to Home Screen') }]
    case 'inapp': return [{ icon: 'dots', text: t('Tap •••') }, { icon: 'browser', text: t('Open in browser') }]
    // Only when Chrome didn't offer its own install window (startInstall uses that first).
    case 'android': return [{ icon: 'vdots', text: t('Tap ⋮ at the top') }, { icon: 'add', text: t('Add to Home screen') }, { icon: 'add', text: t('Install') }]
    default: return [{ icon: 'share', text: t('Tap Share') }, { icon: 'add', text: t('Add to Home Screen') }]
  }
})

const title = computed(() => (kind.value === 'inapp'
  ? t('Open the store in your browser first')
  : t('Add {name} to your home screen', { name: name.value })))
const sub = computed(() => (kind.value === 'inapp'
  ? t('This app\'s browser can\'t add stores to the home screen. Open the page in your browser and we\'ll show the next steps there.')
  : t('Follow the steps. This card stays here while you tap.')))
const after = computed(() => {
  if (kind.value === 'inapp') return ''
  if (kind.value === 'android') return t('If Chrome asks, choose Install (not a shortcut), then tap Install again.')
  return t('Then tap Add.')
})

// The card stays clear of the browser's buttons: at the top when they're at the bottom, and the other way round.
const place = computed(() => (['safari26', 'safari'].includes(kind.value) ? 'top' : 'bottom'))

const arrow = computed(() => {
  const bottom = 'calc(env(safe-area-inset-bottom, 0px) + 6px)'
  const top = 'calc(env(safe-area-inset-top, 0px) + 6px)'
  switch (kind.value) {
    case 'safari26': return { style: { right: '14px', bottom } }
    case 'safari': return { style: { left: 'calc(50% - 18px)', bottom } }
    case 'ipad': return { up: true, style: { right: '96px', top } }
    case 'chrome': return { up: true, style: { right: '56px', top } }
    case 'inapp':
    case 'android': return { up: true, style: { right: '10px', top } }
    default: return null
  }
})

const closeBtn = ref(null)
watch(() => install.guide, async (open) => {
  if (!open) return
  if (kind.value === 'inapp') markForBrowser()
  await nextTick()
  closeBtn.value?.focus()
})
</script>

<style scoped>
.ig-shade { position: fixed; inset: 0; z-index: 9000; background: rgba(0, 0, 0, 0.28); }
.ig-card {
  position: absolute; inset-inline: 12px; max-width: 460px; margin-inline: auto;
  background: #fff; color: #16181d; border-radius: 18px; padding: 14px;
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.25); display: grid; gap: 10px; font-size: 14px; line-height: 1.4;
}
.ig-card.is-top { top: calc(env(safe-area-inset-top, 0px) + 12px); }
.ig-card.is-bottom { bottom: calc(env(safe-area-inset-bottom, 0px) + 84px); }
.ig-head { display: flex; gap: 10px; align-items: flex-start; }
.ig-icon { width: 40px; height: 40px; border-radius: 10px; flex: none; object-fit: cover; }
.ig-head-text { flex: 1; min-width: 0; }
.ig-title { font-weight: 700; font-size: 15px; }
.ig-sub { color: #5f6570; font-size: 13px; }
.ig-x { flex: none; width: 30px; height: 30px; border-radius: 50%; border: 0; background: #f0f1f3; color: #444; font-size: 18px; cursor: pointer; }
.ig-steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(var(--n, 3), minmax(0, 1fr)); gap: 6px; }
.ig-step { background: #f4f5f7; border-radius: 12px; padding: 8px 4px; display: grid; gap: 4px; justify-items: center; text-align: center; font-size: 12px; line-height: 1.25; }
.ig-num { font-size: 11px; color: #8a8f99; font-weight: 600; }
.ig-ico { width: 22px; height: 22px; color: var(--q-secondary, #2f5bd8); display: block; }
.ig-ico :deep(svg) { width: 22px; height: 22px; display: block; }
.ig-after { text-align: center; color: #5f6570; font-size: 13px; }
.ig-arrow { position: fixed; z-index: 9001; color: #fff; filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5)); animation: ig-bob 1.1s ease-in-out infinite; pointer-events: none; }
.ig-arrow.up { transform: rotate(180deg); animation-name: ig-bob-up; }
@keyframes ig-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(7px); } }
@keyframes ig-bob-up { 0%, 100% { transform: rotate(180deg) translateY(0); } 50% { transform: rotate(180deg) translateY(7px); } }
@media (prefers-reduced-motion: reduce) { .ig-arrow { animation: none; } }
</style>
