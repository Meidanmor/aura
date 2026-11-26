<template>
  <InstallGuide />
  <InstallAsk v-if="repeatHere" place="repeat" />
  <Teleport to="body">
    <div v-if="gift && !isQuietPage(route.path)" class="ig-gift" role="dialog" aria-modal="false" aria-labelledby="ig-gift-title">
      <button type="button" class="ig-gift__x" :aria-label="t('Close')" @click="closeGift">×</button>
      <div id="ig-gift-title" class="ig-gift__title">{{ gift.kind === 'push' ? t('Thanks for turning on alerts!') : t('Thanks for adding us!') }}</div>
      <div class="ig-gift__body">{{ t('Here\'s a thank-you gift. Use this code at checkout:') }}</div>
      <div class="ig-gift__code">
        <span dir="ltr">{{ gift.code }}</span>
        <button type="button" class="ig-gift__copy" @click="copy">{{ copied ? t('Copied') : t('Copy') }}</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import InstallGuide from 'src/components/app/InstallGuide.vue'
import InstallAsk from 'src/components/app/InstallAsk.vue'
import { giftSeen, initInstall, install, installSettings } from 'src/services/install.js'
import { t } from 'src/i18n/index.js'
// The gift card waits until the shopper leaves the checkout (src/utils/quiet-page.js).
import { isQuietPage } from 'src/utils/quiet-page.js'

/**
 * Everything about adding the store to the home screen that isn't tied to one page: the
 * step card, the second-visit ask, and the owner's thank-you coupons (shown once: inside
 * the added app, and after turning on notifications). Mounted once by MainLayout, browser only.
 */
const route = useRoute()
const gift = ref(null)
const copied = ref(false)

// Pages with their own ask, or where a card would get in the way of paying.
const BUSY = /^\/([a-z]{2}\/)?(cart|checkout|thank-you|my-account)(\/|$)/
const repeatHere = computed(() => !BUSY.test(route.path) && route.query.qwoo_editor !== '1')

async function showInstallGift() {
  if (!install.installed || giftSeen.install()) return
  const s = await installSettings()
  if (s.gift) gift.value = { kind: 'install', code: s.gift }
}
async function onPushOn() {
  if (giftSeen.push()) return
  const s = await installSettings()
  if (s.push_gift) gift.value = { kind: 'push', code: s.push_gift }
}
function closeGift() {
  if (gift.value?.kind === 'push') giftSeen.markPush()
  else giftSeen.markInstall()
  gift.value = null
}
async function copy() {
  try {
    await navigator.clipboard.writeText(gift.value.code)
    copied.value = true
  } catch { /* the code stays on screen to type */ }
}

onMounted(() => {
  initInstall()
  showInstallGift()
  window.addEventListener('qwoo:push-on', onPushOn)
})
onUnmounted(() => window.removeEventListener('qwoo:push-on', onPushOn))
</script>

<style scoped>
.ig-gift {
  position: fixed; z-index: 9002; inset-inline: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
  max-width: 420px; margin-inline: auto; background: var(--q-primary, #fff); color: var(--q-secondary, #16181d); border-radius: 18px; padding: 16px;
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.25); display: grid; gap: 8px;
}
.ig-gift__x { position: absolute; top: 8px; inset-inline-end: 8px; width: 30px; height: 30px; border-radius: 50%; border: 0; background: color-mix(in srgb, currentColor 10%, transparent); color: inherit; font-size: 18px; cursor: pointer; }
.ig-gift__title { font-weight: 700; font-size: 16px; padding-inline-end: 34px; }
.ig-gift__body { color: color-mix(in srgb, var(--q-secondary, #16181d) 72%, var(--q-primary, #fff)); font-size: 14px; }
.ig-gift__code { display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px dashed #c9ccd3; border-radius: 12px; padding: 10px 12px; font-weight: 700; font-size: 18px; letter-spacing: 0.04em; }
.ig-gift__copy { border: 0; background: var(--q-secondary, #2f5bd8); color: var(--q-on-secondary, #fff); box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 22%, transparent); border-radius: 9px; padding: 7px 14px; font: inherit; font-size: 14px; letter-spacing: 0; cursor: pointer; }
</style>
