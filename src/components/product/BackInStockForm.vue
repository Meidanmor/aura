<template>
  <div v-if="show" class="bis" :class="alignClass" :style="vars">
    <div v-if="title" class="bis__title" :class="titleText.class" :style="titleText.style">{{ title }}</div>

    <!-- Done (push or email) -->
    <div v-if="state === 'done' || state === 'emailed'" class="bis__done" role="status" :class="bodyText.class" :style="bodyText.style">
      <q-icon :name="matCheckCircle" size="20px" />
      <span>{{ state === 'emailed' ? t('Done! We\'ll email you when it\'s back.') : (d.done_text || t('Done! We\'ll let you know when it\'s back.')) }}</span>
    </div>

    <template v-else>
      <p v-if="text" class="bis__text" :class="bodyText.class" :style="bodyText.style">{{ text }}</p>

      <!-- Push: the browser asks to allow notifications on the first click. -->
      <template v-if="canPush">
        <div v-if="state === 'failed'" class="bis__error" role="alert">
          {{ blocked
            ? t('Notifications are blocked for this store in your browser. To get the alert, allow notifications for this site in the browser\'s settings (the icon next to the address), then try again.')
            : t('We can only send the alert if you allow notifications. Choose "Allow" when your browser asks.') }}
        </div>
        <div class="bis__buttons">
          <q-btn
              :label="state === 'failed' ? t('Allow notifications') : (d.button_label || t('Notify me when it\'s back'))"
              :icon="matNotificationsNone"
              class="bis__btn"
              :class="[buttonText.class, paddingVars.cls]"
              :style="[buttonText.style, buttonColors]"
              :outline="outline"
              :unelevated="!outline"
              color="secondary"
              no-caps
              :loading="state === 'asking'"
              @click="askPush"
          />
        </div>
      </template>

      <!-- Email: only once push couldn't work (failed, or no push on this device). -->
      <form v-if="showEmail" class="bis__email" novalidate @submit.prevent="sendEmail">
        <div v-if="canPush" class="bis__email-title" :class="bodyText.class" :style="bodyText.style">{{ d.email_title || t('Or get an email instead') }}</div>
        <q-input :for="fid('email')"
            v-model="email"
            type="email"
            autocomplete="email"
            inputmode="email"
            dense
            v-bind="look"
            :label="t('Your email')"
            :error="!!emailError"
            :error-message="emailError"
            hide-bottom-space
        />
        <!-- People never see this field; bots fill it. -->
        <input v-model="website" class="bis__hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="bis__buttons">
          <q-btn
              type="submit"
              :label="d.email_button || t('Email me')"
              :icon="matMailOutline"
              class="bis__btn"
              :class="[buttonText.class, paddingVars.cls]"
              :style="[buttonText.style, buttonColors]"
              :outline="outline"
              :unelevated="!outline"
              color="secondary"
              no-caps
              :loading="state === 'emailing'"
          />
        </div>
      </form>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { matCheckCircle, matMailOutline, matNotificationsNone } from '@quasar/extras/material-icons'
import { getPushConfig, requestBackInStock, requestBackInStockEmail, wantsBack } from 'src/services/push/shared.js'
import { subscribeToWebPush } from 'src/services/push/push.js'
import { t } from 'src/i18n/index.js'
import { useFieldIds } from 'src/utils/field-id.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { alignToFlex, alignToText, asResponsive, setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'

/**
 * "Notify me when it's back" on a sold-out product (dashboard → Notifications → Settings
 * turns it off). Push first: the click makes the browser ask to allow notifications.
 * If that fails (blocked, dismissed, or no push on this device) it explains why, can
 * ask again, and offers an email instead. Drawn only in the browser (push support and
 * the store's setting are only known there). Used by the Back In Stock Form block and,
 * when the page has none, by Add To Cart with this built-in look.
 */
const props = defineProps({
  product: { type: Object, default: null },
  data: { type: Object, default: () => ({}) },
  // Store builder preview: shown even for products in stock.
  preview: { type: Boolean, default: false },
})
const d = computed(() => props.data || {})
const fid = useFieldIds()

const ready = ref(false)
const cfg = ref(null)
const state = ref('idle') // idle | asking | failed | emailing | done | emailed
const blocked = ref(false)
const email = ref('')
const website = ref('')
const emailError = ref('')

const pushWorks = () => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
const canPush = computed(() => !!cfg.value?.backPush && !!cfg.value?.key && pushWorks())
const show = computed(() => ready.value && !!props.product && (props.preview
  || (!!cfg.value?.backForm && !props.product.is_in_stock && props.product.status !== 'draft' && (canPush.value || !!cfg.value?.backEmail))))
const showEmail = computed(() => !!cfg.value?.backEmail && (!canPush.value || state.value === 'failed' || state.value === 'emailing'))

const title = computed(() => d.value.title || t('Sold out for now'))
const text = computed(() => d.value.text || t('We\'ll let you know the moment it\'s back.'))

onMounted(async () => {
  cfg.value = await getPushConfig()
  if (wantsBack(props.product?.id)) state.value = 'done'
  ready.value = true
})

// The service worker may never be ready (no worker on this page): give up after a while.
const withTimeout = (promise, ms) => Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(false), ms))])

async function askPush() {
  state.value = 'asking'
  try {
    const subscribed = await withTimeout(subscribeToWebPush(), 20000)
    const ok = subscribed !== false && Notification.permission === 'granted' && (await requestBackInStock(props.product.id))
    blocked.value = Notification.permission === 'denied'
    state.value = ok ? 'done' : 'failed'
  } catch {
    state.value = 'failed'
  }
}

async function sendEmail() {
  emailError.value = ''
  const value = email.value.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    emailError.value = t('Enter a valid email address.')
    return
  }
  const before = state.value
  state.value = 'emailing'
  const res = await requestBackInStockEmail(props.product.id, value, website.value)
  if (res.ok) {
    state.value = 'emailed'
  } else {
    state.value = before === 'emailing' ? 'idle' : before
    emailError.value = res.message || t('That didn\'t work. Try again in a moment.')
  }
}

/* ---------------- look (the block's Style tab) ---------------- */
const LOOKS = new Set(['filled', 'outlined', 'standard', 'borderless'])
const look = computed(() => { const l = LOOKS.has(d.value.field_look) ? d.value.field_look : 'outlined'; return l === 'standard' ? {} : { [l]: true } })
const outline = computed(() => d.value.button_style !== 'filled')
const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))
const bodyText = computed(() => textStyle(d.value, tsKeys('text')))
const buttonText = computed(() => textStyle(d.value, tsKeys('button'), 'buttons'))
const buttonColors = computed(() => {
  const bg = resolveGlobalColor(d.value.button_bg)
  if (outline.value) return bg ? { color: `${bg} !important` } : {}
  return { ...(bg ? { background: bg } : {}), ...(d.value.button_text ? { color: resolveGlobalColor(d.value.button_text) } : {}) }
})
const alignClass = computed(() => (d.value.full_width === false ? '' : 'is-full'))
const vars = computed(() => {
  const v = {}
  const r = toCssLength(d.value.button_radius)
  if (r) v['--bis-radius'] = r
  const e = resolveGlobalColor(d.value.error_color)
  if (e) v['--bis-error'] = e
  setResponsiveVar(v, '--bis-gap', d.value.gap, toCssLength)
  // Alignment per screen size (left / right are physical, "default" = the start of the line).
  setResponsiveVar(v, '--bis-ai', d.value.align, (a) => (a === 'default' ? null : alignToFlex(a)))
  setResponsiveVar(v, '--bis-ta', d.value.align, (a) => (a === 'default' ? null : alignToText(a)))
  Object.assign(v, paddingVars.value.vars)
  return v
})
// Button Padding per side and screen size (a side left empty keeps the bigger screen's).
const paddingVars = computed(() => {
  const out = {}
  const cls = {}
  const r = asResponsive(d.value.btn_padding)
  const last = {}
  for (const [device, suffix, short] of [['desktop', '', 'd'], ['tablet', '-t', 't'], ['mobile', '-m', 'm']]) {
    const box = r[device] && typeof r[device] === 'object' ? r[device] : {}
    for (const side of ['top', 'right', 'bottom', 'left']) {
      let v = toCssLength(box[side])
      if (v === null || v === undefined || v === '') v = last[side]
      if (v === null || v === undefined || v === '') continue
      last[side] = v
      out[`--bisp-${side}${suffix}`] = v
      cls[`bisp-${side[0]}-${short}`] = true
    }
  }
  return { vars: out, cls }
})
</script>

<style scoped>
.bis { display: flex; flex-direction: column; gap: var(--bis-gap, 12px); align-items: var(--bis-ai, stretch); text-align: var(--bis-ta, start); }
@media (max-width: 1023px) { .bis { gap: var(--bis-gap-t, var(--bis-gap, 12px)); align-items: var(--bis-ai-t, var(--bis-ai, stretch)); text-align: var(--bis-ta-t, var(--bis-ta, start)); } }
@media (max-width: 767px) { .bis { gap: var(--bis-gap-m, var(--bis-gap-t, var(--bis-gap, 12px))); align-items: var(--bis-ai-m, var(--bis-ai-t, var(--bis-ai, stretch))); text-align: var(--bis-ta-m, var(--bis-ta-t, var(--bis-ta, start))); } }
.bis > * { max-width: 100%; }
.bis__title { font-weight: 600; font-size: 1.1em; }
.bis__text, .bis__email-title { margin: 0; }
.bis__email { display: flex; flex-direction: column; gap: 8px; }
.bis__buttons { display: flex; }
.bis__btn { border-radius: var(--bis-radius, 4px); min-height: 48px; padding-inline: 24px; }
.is-full .bis__btn { width: 100%; }
.bis__done { display: flex; align-items: center; gap: 8px; color: var(--q-positive, #21ba45); }
.bis__error { color: var(--bis-error, var(--q-negative, #c10015)); font-size: 0.92em; }
.bis__hp { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; inset-inline-start: -9999px; }
@media (min-width: 1024px) {
  .bisp-t-d { padding-top: var(--bisp-top) !important; min-height: 0; }
  .bisp-r-d { padding-right: var(--bisp-right) !important; }
  .bisp-b-d { padding-bottom: var(--bisp-bottom) !important; min-height: 0; }
  .bisp-l-d { padding-left: var(--bisp-left) !important; }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .bisp-t-t { padding-top: var(--bisp-top-t, var(--bisp-top)) !important; min-height: 0; }
  .bisp-r-t { padding-right: var(--bisp-right-t, var(--bisp-right)) !important; }
  .bisp-b-t { padding-bottom: var(--bisp-bottom-t, var(--bisp-bottom)) !important; min-height: 0; }
  .bisp-l-t { padding-left: var(--bisp-left-t, var(--bisp-left)) !important; }
}
@media (max-width: 767px) {
  .bisp-t-m { padding-top: var(--bisp-top-m, var(--bisp-top-t, var(--bisp-top))) !important; min-height: 0; }
  .bisp-r-m { padding-right: var(--bisp-right-m, var(--bisp-right-t, var(--bisp-right))) !important; }
  .bisp-b-m { padding-bottom: var(--bisp-bottom-m, var(--bisp-bottom-t, var(--bisp-bottom))) !important; min-height: 0; }
  .bisp-l-m { padding-left: var(--bisp-left-m, var(--bisp-left-t, var(--bisp-left))) !important; }
}
</style>

<style>
/* A Back In Stock Form block on the page replaces Add To Cart's built-in copy. */
body:has(.bis-block) .bis-fallback { display: none; }
</style>
