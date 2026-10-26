<template>
  <!-- A store without tracking code: the plain cookie notice. -->
  <CookieBanner v-if="!asks" />
  <transition v-else name="fade">
    <div v-if="visible" class="cookie-banner consent-banner" role="dialog" :aria-label="title || t('Cookies')" aria-live="polite">
      <div class="consent-body">
        <div v-if="title" class="consent-title">{{ title }}</div>
        <div class="cookie-text">
          {{ text }}
          <router-link v-if="privacyPath" :to="privacyPath" class="consent-link">{{ t('Privacy') }}</router-link>
        </div>

        <div v-if="choosing" class="consent-groups">
          <label class="consent-group">
            <input type="checkbox" checked disabled>
            <span><b>{{ t('Necessary') }}</b><small>{{ t('Needed for the store to work: your cart, signing in, checkout.') }}</small></span>
          </label>
          <label class="consent-group">
            <input v-model="picked.analytics" type="checkbox">
            <span><b>{{ t('Analytics') }}</b><small>{{ t('Helps the store see how it\'s used.') }}</small></span>
          </label>
          <label class="consent-group">
            <input v-model="picked.marketing" type="checkbox">
            <span><b>{{ t('Marketing') }}</b><small>{{ t('Lets the store measure its ads and show you relevant ones.') }}</small></span>
          </label>
        </div>
      </div>

      <div class="cookie-actions consent-actions">
        <template v-if="choosing">
          <q-btn unelevated no-caps color="secondary" :label="own.save || t('Save my choice')" @click="done(picked)" />
        </template>
        <template v-else-if="mode === 'notice'">
          <q-btn flat no-caps color="secondary" :label="own.choose || t('Choose')" @click="choose" />
          <q-btn unelevated no-caps color="secondary" :label="own.accept || t('OK')" @click="done({ analytics: true, marketing: true })" />
        </template>
        <template v-else>
          <q-btn flat no-caps color="secondary" :label="own.choose || t('Choose')" @click="choose" />
          <!-- Saying no is as easy as saying yes: the same button. -->
          <q-btn unelevated no-caps color="secondary" :label="own.reject || t('Reject all')" @click="done({ analytics: false, marketing: false })" />
          <q-btn unelevated no-caps color="secondary" :label="own.accept || t('Accept all')" @click="done({ analytics: true, marketing: true })" />
        </template>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import CookieBanner from './CookieBanner.vue'
import { loadPageConfig } from 'src/utils/config-loader.js'
import { allowedNow, codeConfig, consentChoice, saveConsent } from 'src/utils/custom-code.js'
import { currentLang } from 'src/i18n/lang.js'
import { useI18n } from 'src/i18n/index.js'

/**
 * The consent banner (Settings → Tracking & code): shown when the store has
 * analytics or marketing code. "Ask first": nothing of that runs before the
 * shopper agrees (Accept all / Reject all / Choose). "Notice only": it runs,
 * and the shopper can turn it off. The choice is kept for 6 months; "Cookie
 * settings" links (#cookie-settings) open the choices again.
 */
const { t } = useI18n()
const cfg = codeConfig()
const asks = !!cfg?.ask
const mode = cfg?.mode === 'notice' ? 'notice' : 'ask'
const own = computed(() => cfg?.texts?.[currentLang()] || {})

const visible = ref(false)
const choosing = ref(false)
const picked = reactive({ analytics: false, marketing: false })
const privacyPath = ref('')

const title = computed(() => own.value.title || '')
const text = computed(() => own.value.text || (mode === 'notice'
  ? t('We use cookies to run the store, see how it\'s used and measure our ads. You can turn them off.')
  : t('We use cookies to run the store. With your permission, we also use them to see how the store is used and to measure our ads.')))

const PRIVACY_PATHS = ['privacy-policy', 'privacy']
async function findPrivacyPage() {
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
  choosing.value = true
}

function done(next) {
  saveConsent(next)
  visible.value = false
  choosing.value = false
}

// "Cookie settings": the choices, with what's allowed now.
function reopen() {
  if (!asks) return
  choose()
  visible.value = true
  findPrivacyPage()
}

onMounted(() => {
  if (!asks) return
  window.addEventListener('qwoo:consent-open', reopen)
  if (consentChoice()) return
  visible.value = true
  findPrivacyPage()
})
onUnmounted(() => window.removeEventListener('qwoo:consent-open', reopen))
</script>

<style scoped>
.consent-banner { align-items: flex-end; max-width: 760px; margin-inline: auto; }
.consent-body { flex: 1; min-width: 220px; }
.consent-title { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
.consent-link { margin-inline-start: 6px; color: inherit; text-decoration: underline; }
.consent-groups { display: grid; gap: 10px; margin-top: 12px; }
.consent-group { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; }
.consent-group input { margin-top: 3px; width: 16px; height: 16px; accent-color: var(--q-secondary); }
.consent-group span { display: grid; gap: 2px; font-size: 14px; }
.consent-group small { font-size: 12.5px; opacity: .75; }
.consent-actions { flex-wrap: wrap; }
@media (max-width: 600px) {
  .consent-banner { flex-wrap: wrap; }
  .consent-actions { width: 100%; justify-content: flex-end; }
}
</style>
