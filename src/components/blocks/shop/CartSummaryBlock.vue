<template>
  <!-- "Cart Summary" (cart page / cart drawer): the amounts of Cart Totals on their own. -->
  <div v-if="c && !c.cart.state.offline && c.cart.hasItems.value && ready" class="relative-position cart-summary" :class="`cart-summary--${layout}`">
    <div v-if="c.cart.state.loading.cart" class="blockUi"></div>
    <div v-for="line in lines" :key="line.key" class="cart-summary__line" :class="linesText.class" :style="linesText.style">
      <span>{{ line.label }}</span><span dir="ltr">{{ line.amount }}</span>
    </div>
    <GiftCardsApplied v-if="d.show_giftcards !== false" />
    <div class="cart-summary__line cart-summary__total text-h6" :class="totalText.class" :style="totalText.style">
      <span>{{ d.total_label || t('Total') }}</span><span dir="ltr">{{ formatCurrency(c.cartTotal) }}</span>
    </div>
    <div v-if="d.note" class="cart-summary__note text-caption" :class="noteText.class" :style="noteText.style">{{ d.note }}</div>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { formatCurrency } from 'src/utils/formatters.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import GiftCardsApplied from 'src/components/shop/GiftCardsApplied.vue'
import { t } from 'src/i18n/index.js'

const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('cartPage', null)
const d = computed(() => props.data.data || {})
const ready = ref(false)
onMounted(() => { ready.value = true })
const layout = computed(() => (d.value.layout === 'together' ? 'together' : 'spread'))
const linesText = computed(() => textStyle(d.value, tsKeys('lines')))
const totalText = computed(() => textStyle(d.value, tsKeys('total'), 'headings'))
const noteText = computed(() => textStyle(d.value, tsKeys('note')))

const lines = computed(() => {
  const totals = c?.displayCart?.totals || {}
  const out = []
  if (d.value.show_subtotal) out.push({ key: 'sub', label: t('Subtotal'), amount: formatCurrency(totals.total_items || '0') })
  if (d.value.show_discount !== false && Number(c?.cartTotalDiscount) > 0) out.push({ key: 'disc', label: t('Discount'), amount: `−${formatCurrency(c.cartTotalDiscount)}` })
  // Shipping is known once the store worked out a rate (an address or a single zone).
  const rates = c?.displayCart?.shipping_rates?.[0]?.shipping_rates || []
  if (d.value.show_shipping && rates.length && totals.total_shipping != null) {
    out.push({ key: 'ship', label: t('Shipping'), amount: Number(totals.total_shipping) > 0 ? formatCurrency(totals.total_shipping) : t('Free') })
  }
  return out
})
</script>

<style scoped>
.cart-summary__line { display: flex; gap: 8px; align-items: baseline; }
.cart-summary--spread .cart-summary__line { justify-content: space-between; }
.cart-summary__total { margin-top: 4px; }
.cart-summary__note { opacity: .75; margin-top: 4px; }
</style>
