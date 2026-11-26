<template>
  <div v-if="visible" class="qco" :class="[`qco--${layout}`]" :style="vars">
    <div v-if="title || line || description" class="qco__text">
      <div v-if="title" class="qco__title" :class="titleText.class" :style="titleText.style">{{ title }}</div>
      <div v-if="line" class="qco__value">{{ line }}</div>
      <div v-if="description" class="qco__desc" :class="bodyText.class" :style="bodyText.style">{{ description }}</div>
    </div>
    <div v-if="code" class="qco__parts">
      <!-- The code: tap to copy it (unless turned off), in one of three looks. -->
      <component
        :is="codeClick ? 'button' : 'div'"
        :type="codeClick ? 'button' : undefined"
        class="qco__code"
        :class="[`qco__code--${look}`, { 'qco__code--full': d.code_full }]"
        :aria-label="codeClick ? t('Copy the code {code}', { code }) : undefined"
        @click="codeClick ? copyCode() : undefined"
      >
        <span v-if="hintText" class="qco__hint">{{ hintText }}</span>
        <span class="qco__code-text" :class="codeText.class" :style="codeText.style" dir="ltr">{{ code }}</span>
      </component>
      <q-btn
        v-if="showCopy" no-caps unelevated
        class="qco__btn" :class="[`qco__btn--${copyStyle}`, { 'qco__btn--full': d.copy_full }]" :style="copyBtn"
        :label="copied ? t('Copied') : (d.button_label || t('Copy code'))" @click="copyCode"
      />
      <q-btn
        v-if="d.apply !== false" no-caps unelevated
        class="qco__btn" :class="[`qco__btn--${applyStyle}`, { 'qco__btn--full': d.apply_full }]" :style="applyBtn"
        :loading="applying" :label="applied ? t('Applied to your cart') : (d.apply_label || t('Apply to my cart'))" :disable="applied" @click="applyCode"
      />
    </div>
    <div class="qco__status" role="status">{{ status }}</div>
    <div v-if="problem" class="qco__problem" role="alert">{{ problem }}</div>
    <div v-if="previewNote" class="qco__note" role="status">{{ previewNote }}</div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n, currentLocale } from 'src/i18n/index.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { alignToFlex } from 'src/composables/useSectionStyle.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { formatCurrency } from 'src/utils/formatters.js'
import cart from 'src/stores/cart.js'
import { isEditorMode } from 'src/utils/config-loader.js'

/**
 * "Coupon" (Store builder; type personalized_offer): a discount code from Marketing → Discounts.
 * Three parts, each with its own look (owner-approved prototype, 2026-11-26): the code (big in a dashed box,
 * a tag, or text with a dashed underline; tapping it copies it unless turned off), a copy button and an
 * apply-to-cart button (filled, outline or text; each can be hidden). Layout: column (one under the other,
 * new blocks), stack (text above, code and buttons in a row: saved blocks) or row (all side by side).
 * Saved blocks keep their title, text, amount and end date lines. Hides once the code ended or was removed.
 * A code can also sit inside any heading or text (src/boot/copy-codes.js).
 */
const props = defineProps({ data: { type: Object, default: () => ({}) }, blockId: { type: String, default: '' } })
const { t } = useI18n()
const d = computed(() => props.data?.data || {})
const info = computed(() => d.value.coupon_info || {})
const code = computed(() => String(d.value.coupon_code || '').trim())
const title = computed(() => String(d.value.title || '').trim())
const description = computed(() => String(d.value.description || '').trim())
const layout = computed(() => (['row', 'column'].includes(d.value.layout) ? d.value.layout : 'stack'))
const look = computed(() => (['box', 'tag', 'plain'].includes(d.value.code_look) ? d.value.code_look : 'box'))
const codeClick = computed(() => d.value.code_copy !== false)
const showCopy = computed(() => d.value.show_copy !== false)
const pick = (v, fallback) => (['filled', 'outline', 'text'].includes(v) ? v : fallback)
const copyStyle = computed(() => pick(d.value.copy_style, 'outline'))
const applyStyle = computed(() => pick(d.value.apply_style, 'filled'))

// The end date is checked in the browser only (the server's day may differ): own mounted flag.
const mounted = ref(false)
const editor = ref(false)
onMounted(() => { mounted.value = true; editor.value = isEditorMode() })
const ended = computed(() => {
  if (!mounted.value || !info.value.ends) return false
  const now = new Date()
  const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return info.value.ends < ymd
})
// A code the store doesn't know any more hides; a block with no code yet shows its texts (the owner is building it).
const visible = computed(() => info.value.ok !== false && !ended.value)

const money = (n) => {
  const unit = Number(cart.state.cart_array?.totals?.currency_minor_unit ?? 2)
  return formatCurrency(String(Math.round(Number(n || 0) * 10 ** unit)))
}
const line = computed(() => {
  const i = info.value
  // After mount: the cart's currency and the browser's date (the same first render as the server's).
  if (!i.ok || !mounted.value) return ''
  const parts = []
  if (d.value.show_amount !== false) {
    if (i.amount > 0) parts.push(i.type === 'percent' ? t('{n}% off', { n: Number(i.amount) }) : t('{amount} off', { amount: money(i.amount) }))
    if (i.free_shipping) parts.push(t('Free shipping'))
    if (i.min > 0) parts.push(t('On orders over {amount}', { amount: money(i.min) }))
  }
  if (d.value.show_end !== false && i.ends) {
    const date = new Date(`${i.ends}T12:00:00`)
    parts.push(t('Ends {date}', { date: date.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'long' }) }))
  }
  return parts.join(' · ')
})

const color = (key) => resolveGlobalColor(d.value[key]) || ''
const vars = computed(() => {
  const v = {}
  const flex = alignToFlex(d.value.alignment || 'center') || 'center'
  v['--qco-align'] = flex
  v['--qco-text'] = flex === 'flex-start' ? 'start' : flex === 'flex-end' ? 'end' : 'center'
  if (color('text_color')) v['--qco-color'] = color('text_color')
  if (color('background')) v['--qco-bg'] = color('background')
  if (color('code_border')) v['--qco-border'] = color('code_border')
  if (color('code_bg')) v['--qco-code-bg'] = color('code_bg')
  if (d.value.code_radius) v['--qco-code-radius'] = String(d.value.code_radius)
  return v
})
/** A button's colours: filled = its colour behind light text; outline = a frame and text in its colour; text = only the text. */
function buttonStyle (style, main, ink, radius) {
  // No colour set: filled takes the store's button colour, outline and text the text's own colour (as saved blocks had).
  const c = main || (style === 'filled' ? 'var(--q-secondary)' : 'currentColor')
  const s = {}
  if (style === 'filled') { s.background = c; s.color = ink || '#fff' } else { s.color = ink || c }
  if (style === 'outline') s.borderColor = c
  if (radius) s.borderRadius = String(radius)
  return s
}
const copyBtn = computed(() => buttonStyle(copyStyle.value, color('button_color'), color('copy_text_color'), d.value.copy_radius))
const applyBtn = computed(() => buttonStyle(applyStyle.value, color('apply_color') || color('button_color'), color('apply_text_color'), d.value.apply_radius))
const titleText = computed(() => textStyle(d.value, tsKeys('title')))
const bodyText = computed(() => textStyle(d.value, tsKeys('text')))
const codeText = computed(() => textStyle(d.value, tsKeys('code')))

const copied = ref(false)
const status = ref('')
// With the code alone (no copy button), the line above it says "Copied" for a moment.
const hintText = computed(() => (copied.value && !showCopy.value ? t('Copied') : String(d.value.code_hint || '').trim()))
let timer = 0
async function copyCode () {
  if (!code.value) return
  try {
    await navigator.clipboard.writeText(code.value)
    copied.value = true
    status.value = t('Copied')
    clearTimeout(timer)
    timer = setTimeout(() => { copied.value = false; status.value = '' }, 1800)
  } catch { /* no clipboard: the code stays visible to copy by hand */ }
}

const applying = ref(false)
const applied = ref(false)
const problem = ref('')
const previewNote = ref('')
async function applyCode () {
  if (!code.value || applying.value) return
  // In the preview, a code the store doesn't know yet: say so calmly instead of the store's "doesn't exist" (owner, 2026-11-25).
  if (editor.value && !info.value.ok) {
    previewNote.value = t('Preview: this code works once it is approved and published.')
    return
  }
  applying.value = true
  problem.value = ''
  try {
    await cart.applyCoupon(code.value)
    applied.value = true
  } catch (err) {
    problem.value = err?.message || t("This code can't be used right now.")
  } finally {
    applying.value = false
  }
}
</script>

<style scoped>
.qco { position: relative; display: flex; flex-direction: column; align-items: var(--qco-align, center); gap: 12px; padding: 20px; border-radius: 12px; background: var(--qco-bg, transparent); color: var(--qco-color, inherit); text-align: var(--qco-text, center); }
.qco--row { flex-direction: row; flex-wrap: wrap; justify-content: space-between; align-items: center; }
.qco__text { display: grid; gap: 4px; }
.qco__title { font-size: 1.25em; font-weight: 600; }
.qco__value { font-weight: 600; opacity: .85; }
.qco__desc { white-space: pre-line; }
.qco__parts { display: flex; flex-wrap: wrap; align-items: center; justify-content: var(--qco-align, center); gap: 10px; }
.qco--column .qco__parts { flex-direction: column; align-items: var(--qco-align, center); width: 100%; }
.qco__code { font: inherit; color: inherit; background: var(--qco-code-bg, transparent); border: 0; padding: 0; display: inline-flex; flex-direction: column; align-items: center; gap: 2px; }
button.qco__code { cursor: pointer; }
.qco__code:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
.qco__code-text { font-weight: 800; letter-spacing: .1em; }
.qco__hint { font-size: .8em; opacity: .8; }
.qco__code--box { padding: 10px 18px; border: 2px dashed var(--qco-border, currentColor); border-radius: var(--qco-code-radius, 10px); }
.qco__code--box .qco__code-text { font-size: 1.25em; }
.qco--column .qco__code--box { padding: 12px 22px; }
.qco--column .qco__code--box .qco__code-text { font-size: 1.6em; }
.qco__code--tag { flex-direction: row; gap: 8px; padding: 6px 14px; border: 1.5px dashed var(--qco-border, currentColor); border-radius: var(--qco-code-radius, 999px); }
.qco__code--tag .qco__code-text { font-size: 1.1em; }
.qco__code--plain .qco__code-text { font-size: 1.3em; text-decoration: underline dashed 2px; text-decoration-color: var(--qco-border, currentColor); text-underline-offset: .22em; }
.qco__code--full, .qco__btn--full { align-self: stretch; width: 100%; }
.qco__btn { min-height: 44px; border-radius: 10px; font-weight: 600; border: 1.5px solid transparent; }
.qco__btn--outline { background: transparent; }
.qco__btn--text { background: transparent; text-decoration: underline; text-underline-offset: 3px; }
.qco__status { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.qco__note { font-size: .9em; opacity: .8; }
.qco__problem { font-size: .9em; color: var(--q-negative, #c10015); }
</style>
