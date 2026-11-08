<template>
  <!-- The cart is known in the browser only: drawn after this block mounts. -->
  <div v-if="ready && shown" class="fsb" :class="`fsb--${align}`" :style="vars" data-sb-part="Bar">
    <div class="fsb__text" v-bind="text" data-sb-part="Text">{{ message }}</div>
    <div class="fsb__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="percent" :aria-label="message">
      <div class="fsb__bar" :style="{ width: `${percent}%` }" />
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import cartStore from 'src/stores/cart.js'
import { formatCurrency } from 'src/utils/formatters.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { toCssLength } from 'src/composables/useSectionStyle.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { isEditorMode } from 'src/utils/config-loader.js'
import { t } from 'src/i18n/index.js'

/**
 * "Free Shipping Bar": how much more the cart needs for free shipping, with a
 * line that fills up. The amount is the owner's (Free Shipping From), else the
 * store's free shipping minimum for the shopper's zone, which comes with every
 * cart answer (extensions.qwoo.free_shipping, the store's Qwoo_Cart_Extras).
 * In the cart drawer and on the cart page it reads their cart (the Store builder
 * preview's sample one too); anywhere else, the shopper's cart.
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const d = computed(() => props.data.data || {})
const cartPage = inject('cartPage', null)
const theCart = computed(() => cartPage?.cart || cartStore)

const ready = ref(false)
const editor = ref(false)
onMounted(() => {
  ready.value = true
  editor.value = isEditorMode()
})

const totals = computed(() => theCart.value.state?.totals || theCart.value.state?.cart_array?.totals || {})
const unit = computed(() => {
  const u = Number(totals.value.currency_minor_unit ?? cartStore.state.cart_array?.totals?.currency_minor_unit)
  return Number.isInteger(u) && u >= 0 ? u : 2
})
const free = computed(() => theCart.value.state?.cart_array?.extensions?.qwoo?.free_shipping || null)
const count = computed(() => Number(theCart.value.state?.items_count) || (theCart.value.state?.items || []).length || 0)

// The owner's amount ("200", "199.90"), in the smallest currency unit.
const ownMin = computed(() => {
  const raw = String(d.value.amount ?? '').replace(/[^\d.,]/g, '').replace(',', '.')
  const n = parseFloat(raw)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10 ** unit.value) : null
})
const min = computed(() => {
  if (ownMin.value !== null) return ownMin.value
  const m = Number(free.value?.min)
  if (free.value && Number.isFinite(m)) return m
  // The Store builder's preview of a store without free shipping: a sample amount, so it shows.
  return editor.value ? 200 * 10 ** unit.value : null
})
// What counts: the store's own figure while it's current, else the items less discounts.
const total = computed(() => {
  const tt = totals.value
  if (free.value && ownMin.value === null && !tt._local && !theCart.value.sample) return Number(free.value.total) || 0
  return Math.max(0, (Number(tt.total_items) || 0) - (Number(tt.total_discount) || 0))
})
const remaining = computed(() => Math.max(0, (min.value || 0) - total.value))
const percent = computed(() => (min.value > 0 ? Math.min(100, Math.round((total.value / min.value) * 100)) : 100))

const shown = computed(() => min.value !== null && !(d.value.hide_when_empty !== false && count.value === 0 && !editor.value))
const message = computed(() => {
  if (remaining.value <= 0) return d.value.text_done || t('You get free shipping!')
  const amount = formatCurrency(String(remaining.value), { minorUnit: unit.value })
  return String(d.value.text_before || t('Add {amount} more for free shipping')).replace('{amount}', amount)
})

const align = computed(() => (['left', 'center', 'right'].includes(d.value.align) ? d.value.align : 'start'))
const text = computed(() => textStyle(d.value, tsKeys('text')))
const vars = computed(() => {
  const v = {}
  const bar = resolveGlobalColor(d.value.bar_color || 'global:secondary')
  if (bar) v['--fsb-bar'] = bar
  const track = resolveGlobalColor(d.value.track_color)
  if (track) v['--fsb-track'] = track
  const h = toCssLength(d.value.bar_height)
  if (h) v['--fsb-h'] = h
  const r = toCssLength(d.value.bar_radius)
  if (r) v['--fsb-r'] = r
  return v
})
</script>

<style scoped>
.fsb { display: grid; gap: 8px; }
.fsb--center { text-align: center; }
.fsb--right { text-align: right; }
.fsb__track { height: var(--fsb-h, 6px); border-radius: var(--fsb-r, 99px); background: var(--fsb-track, rgba(0, 0, 0, 0.08)); overflow: hidden; }
.fsb__bar { height: 100%; border-radius: inherit; background: var(--fsb-bar, var(--q-secondary)); transition: width 0.4s ease; }
</style>
