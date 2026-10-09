<template>
  <transition name="fade">
    <div v-if="visible" class="cookie-banner" role="region" :aria-label="t('Cookies')">
      <div class="cookie-text">
        {{ t('We use cookies to improve your experience on our website.') }}
      </div>

      <div class="cookie-actions">
        <!-- Only when the store has a privacy page (Design → Pages); never a link to nowhere. -->
        <q-btn
          v-if="privacyPath"
          flat
          no-caps
          :label="t('Privacy')"
          :to="privacyPath"
          color="secondary"
        />

        <q-btn
          unelevated
          no-caps
          color="secondary"
          :label="t('Accept')"
          @click="acceptCookies"
        />
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { loadPageConfig } from 'src/utils/config-loader.js'

const visible = ref(false)
const privacyPath = ref('')

// The owner's privacy page: the one marked as such, else one at a privacy address.
const PRIVACY_PATHS = ['privacy-policy', 'privacy']
async function findPrivacyPage() {
  try {
    const list = (await loadPageConfig('pages', false))?.pages || []
    const page = list.find((p) => p.role === 'privacy') || list.find((p) => PRIVACY_PATHS.includes(p.path || p.slug))
    if (page) privacyPath.value = '/' + (page.path || page.slug)
  } catch { /* no link then */ }
}

onMounted(() => {
  let accepted = null
  try { accepted = localStorage.getItem('cookie_consent') } catch { /* private mode */ }
  if (accepted) return
  visible.value = true
  findPrivacyPage()
})

function acceptCookies() {
  try { localStorage.setItem('cookie_consent', 'accepted') } catch { /* private mode */ }
  visible.value = false
}
</script>
