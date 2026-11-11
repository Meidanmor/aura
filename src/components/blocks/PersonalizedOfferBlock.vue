<template>
  <div v-if="visible" class="qco" :class="[`qco--${layout}`]" :style="vars">
    <div v-if="title || line || description" class="qco__text">
      <div v-if="title" class="qco__title" :class="titleText.class" :style="titleText.style">{{ title }}</div>
      <div v-if="line" class="qco__value">{{ line }}</div>
      <div v-if="description" class="qco__desc" :class="bodyText.class" :style="bodyText.style">{{ description }}</div>
    </div>
    <div v-if="code" class="qco__code-row">
      <code class="qco__code" :class="codeText.class" :style="codeText.style" dir="ltr">{{ code }}</code>
      <q-btn dense no-caps outline class="qco__btn" :label="copied ? t('Copied') : (d.button_label || t('Copy code'))" @click="copyCode" />
      <q-btn v-if="d.apply !== false" dense no-caps unelevated class="qco__btn qco__btn--apply" :loading="applying" :label="applied ? t('Applied to your cart') : (d.apply_label || t('Apply to my cart'))" :disable="applied" @click="applyCode" />
    </div>
    <div v-if="problem" class="qco__problem" role="alert">{{ problem }}</div>
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

/**
 * "Coupon" (Store builder; type personalized_offer): a discount code from Marketing →
 * Discounts with its amount and end date (read by the store when the block was saved),
 * Copy, and Apply to the cart. Hides once the code ended or was removed. For one
 * audience only: the block's Show To (Marketing → Audiences).
 */
const props = defineProps({ data: { type: Object, default: () => ({}) }, blockId: { type: String, default: '' } })
const { t } = useI18n()
const d = computed(() => props.data?.data || {})
const info = computed(() => d.value.coupon_info || {})
const code = computed(() => String(d.value.coupon_code || '').trim())
const title = computed(() => String(d.value.title || '').trim())
const description = computed(() => String(d.value.description || '').trim())
const layout = computed(() => (d.value.layout === 'row' ? 'row' : 'stack'))

// The end date is checked in the browser only (the server's day may differ): own mounted flag.
const mounted = ref(false)
onMounted(() => { mounted.value = true })
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

const vars = computed(() => {
  const v = {}
  const flex = alignToFlex(d.value.alignment || 'center') || 'center'
  v['--qco-align'] = flex
  v['--qco-text'] = flex === 'flex-start' ? 'start' : flex === 'flex-end' ? 'end' : 'center'
  const color = resolveGlobalColor(d.value.text_color)
  if (color) v['--qco-color'] = color
  const bg = resolveGlobalColor(d.value.background)
  if (bg) v['--qco-bg'] = bg
  const border = resolveGlobalColor(d.value.code_border)
  if (border) v['--qco-border'] = border
  const btn = resolveGlobalColor(d.value.button_color)
  if (btn) v['--qco-btn'] = btn
  return v
})
const titleText = computed(() => textStyle(d.value, tsKeys('title')))
const bodyText = computed(() => textStyle(d.value, tsKeys('text')))
const codeText = computed(() => textStyle(d.value, tsKeys('code')))

const copied = ref(false)
async function copyCode() {
  if (!code.value) return
  try {
    await navigator.clipboard.writeText(code.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  } catch { /* no clipboard: the code stays visible to copy by hand */ }
}

const applying = ref(false)
const applied = ref(false)
const problem = ref('')
async function applyCode() {
  if (!code.value || applying.value) return
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
.qco { display: flex; flex-direction: column; align-items: var(--qco-align, center); gap: 12px; padding: 20px; border-radius: 12px; background: var(--qco-bg, transparent); color: var(--qco-color, inherit); text-align: var(--qco-text, center); }
.qco--row { flex-direction: row; flex-wrap: wrap; justify-content: space-between; align-items: center; }
.qco__text { display: grid; gap: 4px; }
.qco__title { font-size: 1.25em; font-weight: 600; }
.qco__value { font-weight: 600; opacity: .85; }
.qco__desc { white-space: pre-line; }
.qco__code-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: var(--qco-align, center); gap: 10px; }
.qco__code { padding: 8px 14px; border: 2px dashed var(--qco-border, currentColor); border-radius: 8px; font-size: 1.1em; font-weight: 700; letter-spacing: .08em; }
.qco__btn { color: var(--qco-btn, inherit); }
.qco__btn--apply { background: var(--qco-btn, var(--q-secondary)); color: #fff; }
.qco__problem { font-size: .9em; color: var(--q-negative, #c10015); }
</style>
