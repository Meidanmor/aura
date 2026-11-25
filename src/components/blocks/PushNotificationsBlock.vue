<template>
  <div
      v-if="visible"
      class="push-block"
      :class="[`push-block--${layout}`, { 'push-block--full': d.button_full }]"
      :style="vars"
  >
    <span v-if="d.show_icon !== false && layout === 'card'" class="push-block__bell" aria-hidden="true">
      <q-icon :name="matNotificationsNone" />
    </span>
    <div v-if="layout === 'card'" class="push-block__body">
      <div class="push-block__title" v-bind="titleText">{{ d.title || t('Get notifications') }}</div>
      <p class="push-block__text" v-bind="bodyText">{{ d.text || t('New products, offers and updates on your orders.') }}</p>
    </div>
    <button
        type="button"
        class="push-block__btn"
        :class="`push-block__btn--${btnStyle}`"
        :disabled="busy"
        v-bind="buttonText"
        @click="turnOn"
    >
      <q-icon v-if="d.show_icon !== false && layout === 'button'" :name="matNotificationsNone" class="push-block__btn-icon" aria-hidden="true" />
      <span>{{ d.button_label || t('Turn on') }}</span>
    </button>
  </div>
</template>

<script setup>
/**
 * Push Notifications (Store builder block): a box with a title, a line and a button, or only a
 * button, that asks the shopper to turn notifications on. Shown only where it can work: the store
 * has a push key, the browser has push, and the shopper hasn't answered yet (MainLayout provides
 * 'pushOffer'). The Store builder preview always shows it, so the owner can style it.
 * In a drawer built from blocks it takes the place of the menu drawer's own box (DrawerSections.vue).
 */
import { computed, inject, ref } from 'vue'
import { matNotificationsNone } from '@quasar/extras/material-icons'
import { useI18n } from 'src/i18n/index.js'
import { isEditorMode } from 'src/utils/config-loader.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { onColor } from 'src/utils/on-color.js'
import { toCssLength } from 'src/composables/useSectionStyle.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
  page: { type: String, default: '' },
})
const { t } = useI18n()
const d = computed(() => props.data?.data || {})
const offer = inject('pushOffer', null)
const busy = ref(false)

const layout = computed(() => (d.value.layout === 'button' ? 'button' : 'card'))
const btnStyle = computed(() => (['outline', 'text'].includes(d.value.button_style) ? d.value.button_style : 'filled'))
const visible = computed(() => {
  if (isEditorMode()) return true
  if (!offer) return false
  return !!offer.keyReady.value && !!offer.supported.value && offer.permission.value === 'default'
})

const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))
const bodyText = computed(() => textStyle(d.value, tsKeys('text')))
const buttonText = computed(() => textStyle(d.value, tsKeys('button'), 'buttons'))

// A store colour ("var(--q-secondary)") reads on its --q-on-<name> variable; a picked colour on its own ink.
function inkOn(bg) {
  const g = String(bg || '').match(/^var\(--q-(primary|secondary|accent)\)$/)
  return g ? `var(--q-on-${g[1]}, #fff)` : onColor(bg)
}

const vars = computed(() => {
  const v = {}
  const bg = resolveGlobalColor(d.value.card_bg)
  if (bg) {
    v['--pb-bg'] = bg
    const ink = inkOn(bg)
    if (ink) v['--pb-ink'] = ink
  }
  const border = resolveGlobalColor(d.value.card_border)
  if (border) v['--pb-border'] = border
  if (toCssLength(d.value.card_radius)) v['--pb-radius'] = toCssLength(d.value.card_radius)
  if (toCssLength(d.value.card_padding)) v['--pb-pad'] = toCssLength(d.value.card_padding)
  const bell = resolveGlobalColor(d.value.icon_color)
  if (bell) v['--pb-bell'] = bell
  const btn = resolveGlobalColor(d.value.button_bg)
  if (btn) v['--pb-btn'] = btn
  const btnInk = resolveGlobalColor(d.value.button_text) || (btn ? inkOn(btn) : '')
  if (btnInk) v['--pb-btn-ink'] = btnInk
  if (toCssLength(d.value.button_radius)) v['--pb-btn-radius'] = toCssLength(d.value.button_radius)
  return v
})

async function turnOn() {
  if (isEditorMode() || !offer || busy.value) return
  busy.value = true
  try {
    await offer.subscribe()
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.push-block { display: flex; align-items: flex-start; gap: 12px; color: var(--pb-ink, inherit); }
.push-block--card {
  padding: var(--pb-pad, 16px);
  border-radius: var(--pb-radius, 12px);
  background: rgba(0, 0, 0, .04);
  background: var(--pb-bg, color-mix(in srgb, currentColor 6%, transparent));
  border: 1px solid rgba(0, 0, 0, .1);
  border: 1px solid var(--pb-border, color-mix(in srgb, currentColor 14%, transparent));
  flex-wrap: wrap;
}
.push-block--button { display: block; }
.push-block__bell {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 50%; font-size: 20px;
  color: var(--pb-bell, var(--q-secondary));
  background: color-mix(in srgb, var(--pb-bell, var(--q-secondary)) 14%, transparent);
}
.push-block__body { flex: 1 1 160px; min-width: 0; }
.push-block__title { font-weight: 600; font-size: 1rem; line-height: 1.3; }
.push-block__text { margin: 4px 0 0; font-size: .875rem; line-height: 1.45; opacity: .8; }
.push-block__btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-height: 40px; padding: 8px 18px; border-radius: var(--pb-btn-radius, 8px);
  font: inherit; font-weight: 600; font-size: .875rem; line-height: 1.2; cursor: pointer;
  border: 1px solid transparent; transition: opacity .2s ease;
}
.push-block--card .push-block__btn { flex: 1 0 100%; }
.push-block--card:not(.push-block--full) .push-block__btn { flex: none; margin-inline-start: 48px; }
.push-block--full .push-block__btn { width: 100%; }
.push-block__btn:disabled { opacity: .6; cursor: default; }
.push-block__btn:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.push-block__btn--filled { background: var(--pb-btn, var(--q-secondary)); color: var(--pb-btn-ink, var(--q-on-secondary, #fff)); }
.push-block__btn--outline { background: transparent; color: var(--pb-btn, currentColor); border-color: var(--pb-btn, currentColor); }
.push-block__btn--text { background: transparent; color: var(--pb-btn, currentColor); padding-inline: 0; text-decoration: underline; text-underline-offset: 3px; }
.push-block__btn-icon { font-size: 1.2em; }
</style>
