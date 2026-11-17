<template>
  <div v-if="shown" class="ia" :class="`ia--${place}`" role="region" :aria-label="title">
    <img src="/icons/icon-128x128.png" alt="" class="ia__icon" width="44" height="44">
    <div class="ia__text">
      <div class="ia__title">{{ title }}</div>
      <div class="ia__body">{{ body }}</div>
    </div>
    <div class="ia__actions">
      <q-btn color="secondary" unelevated no-caps :label="button" class="ia__btn" @click="go" />
      <button v-if="place === 'repeat'" type="button" class="ia__later" :aria-label="t('Close')" @click="close">×</button>
      <button v-else type="button" class="ia__later" @click="close">{{ t('Not now') }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { device, install, later, mayAsk, startInstall } from 'src/services/install.js'
import { getPushConfig } from 'src/services/push/shared.js'
import { t } from 'src/i18n/index.js'
import { storeName } from 'src/utils/site-info.js'

/**
 * Asks the shopper to add the store to their home screen, at the places the owner picked
 * (dashboard → Notifications → Settings → Home screen): thanks = the thank-you page,
 * account = My account, repeat = a small card on the second visit. Closing it hides every
 * ask for 30 days. Drawn only in the browser.
 */
const props = defineProps({
  place: { type: String, required: true }, // thanks | account | repeat
  // My account: only for signed-in customers.
  allowed: { type: Boolean, default: true },
})

const ok = ref(false)
const push = ref(false)
const gift = ref(false)
const android = device().os === 'android'

onMounted(async () => {
  if (new URLSearchParams(location.search).get('qwoo_editor') === '1') return
  ok.value = await mayAsk(props.place)
  const cfg = await getPushConfig()
  push.value = !!cfg.key
  gift.value = !!cfg.install?.gift
})

const shown = computed(() => ok.value && props.allowed && !install.later && !install.installed && !install.guide)
const name = computed(() => storeName() || t('the store'))

const title = computed(() => {
  if (props.place === 'thanks' && push.value) return t('Know the moment it ships')
  return t('{name} on your home screen', { name: name.value })
})
const body = computed(() => {
  const g = gift.value ? ' ' + t('Plus a thank-you gift inside.') : ''
  if (props.place === 'thanks' && push.value) return t('Add us to your home screen and we\'ll send you an alert when your order is on its way.') + g
  return t('Open the store in one tap.') + g
})
const button = computed(() => (android ? t('Install') : t('Add to home screen')))

function go() {
  startInstall()
}
function close() {
  later()
}
</script>

<style scoped>
.ia { display: flex; gap: 12px; align-items: center; background: #fff; color: #16181d; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 16px; padding: 12px 14px; }
.ia__icon { width: 44px; height: 44px; border-radius: 11px; flex: none; object-fit: cover; }
.ia__text { flex: 1; min-width: 0; }
.ia__title { font-weight: 700; }
.ia__body { font-size: 0.92em; color: #5f6570; }
.ia__actions { display: flex; align-items: center; gap: 6px; flex: none; }
.ia__btn { border-radius: 10px; }
.ia__later { border: 0; background: none; color: #5f6570; cursor: pointer; font: inherit; font-size: 0.92em; padding: 6px; text-decoration: underline; }
.ia--thanks, .ia--account { max-width: 640px; margin: 16px auto; flex-wrap: wrap; }
.ia--account { width: calc(100% - 32px); }
.ia--thanks .ia__actions, .ia--account .ia__actions { width: 100%; justify-content: flex-start; }
@media (min-width: 600px) { .ia--thanks .ia__actions, .ia--account .ia__actions { width: auto; } }
/* Second visit: a small card at the bottom (no page jump), above the browser's bar. */
.ia--repeat {
  position: fixed; z-index: 2500; inset-inline: 10px; bottom: calc(env(safe-area-inset-bottom, 0px) + 10px);
  max-width: 520px; margin-inline: auto; box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18); padding: 10px 12px;
}
.ia--repeat .ia__icon { width: 36px; height: 36px; border-radius: 9px; }
.ia--repeat .ia__later { text-decoration: none; font-size: 22px; line-height: 1; color: #8a8f99; }
</style>
