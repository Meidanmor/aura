<template>
  <div
      v-if="c?.ready"
      class="co-sum relative-position"
      :class="[`co-sum--${state}`, { 'co-sum--d-closed': d.open_desktop === false, 'co-sum--m-open': d.open_mobile === true }]"
  >
    <div v-if="c.cart.state.loading.cart === true" class="blockUi"></div>
    <button type="button" class="co-sum__head" :aria-expanded="state === 'auto' ? undefined : String(state === 'open')" :aria-controls="bodyId" @click="toggle">
      <span class="co-sum__title text-h6" :class="titleText.class" :style="titleText.style">{{ d.title || t('Order summary') }}</span>
      <q-icon :name="matExpandMore" size="22px" class="co-sum__arrow" />
      <span v-if="d.show_total !== false" class="co-sum__head-total" :class="totalText.class" :style="totalText.style" dir="ltr">{{ formatCurrency(c.cartTotal) }}</span>
    </button>

    <div :id="bodyId" class="co-sum__body">
      <div v-if="d.show_items !== false" class="co-sum__items">
        <div v-for="item in c.cartItems" :key="item.key" class="co-sum__item" :class="itemText.class" :style="itemText.style">
          <div class="co-sum__photo" :style="{ width: size, height: size }">
            <q-img v-if="item?.images?.length" :src="item.images[0].src" :alt="item.name" :width="size" :height="size" class="rounded-borders" />
            <span class="co-sum__qty">{{ item.quantity }}</span>
          </div>
          <div class="co-sum__name">
            {{ item.name }}
            <GiftLineDetails v-if="item.gift" :gift="item.gift" />
            <div v-for="(variation, index) in item.variation || []" :key="index" class="text-caption">{{ variation.attribute }}: {{ variation.value }}</div>
          </div>
          <div class="co-sum__amount" dir="ltr">{{ formatCurrency(item.totals?.line_total ?? (parseInt(toRaw(item.prices)?.price || 0) * item.quantity).toString()) }}</div>
        </div>
      </div>

      <CheckoutCouponBlock v-if="d.show_coupon" class="co-sum__coupon" :data="{ data: { show_title: false, field_look: d.field_look } }" :block-id="`${blockId}-coupon`" page="checkout" />

      <div v-if="d.show_lines !== false || d.show_grand !== false" class="co-sum__lines">
        <template v-if="d.show_lines !== false">
          <div v-for="line in lines" :key="line.key" class="co-sum__line">
            <span>{{ line.label }}</span><span dir="ltr">{{ line.amount }}</span>
          </div>
          <GiftCardsApplied />
        </template>
        <div v-if="d.show_grand !== false" class="co-sum__line co-sum__total text-h6" :class="totalText.class" :style="totalText.style">
          <span>{{ t('Total') }}</span><span dir="ltr">{{ formatCurrency(c.cartTotal) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, ref, toRaw, useId } from 'vue'
import { matExpandMore } from '@quasar/extras/material-icons'
import { formatCurrency } from 'src/utils/formatters.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { toCssLength } from 'src/composables/useSectionStyle.js'
import GiftLineDetails from 'src/components/shop/GiftLineDetails.vue'
import GiftCardsApplied from 'src/components/shop/GiftCardsApplied.vue'
import CheckoutCouponBlock from './CheckoutCouponBlock.vue'
import { t } from 'src/i18n/index.js'

/**
 * "Order Summary" (checkout page template): a header with the total that opens and closes the
 * items, a coupon box and the totals. Until the shopper clicks, the screen size decides
 * (CSS, so the server's page matches): open on computers and tablets, closed on phones, unless
 * the owner set otherwise.
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('checkoutPage', null)
const d = computed(() => props.data.data || {})
const bodyId = `co-sum-${useId()}`
const size = computed(() => toCssLength(d.value.image_size) || '64px')
const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))
const itemText = computed(() => textStyle(d.value, tsKeys('item')))
const totalText = computed(() => textStyle(d.value, tsKeys('total'), 'headings'))

// 'auto' (the screen decides, see the styles), then 'open' / 'closed'.
const state = ref('auto')
const PHONE = '(max-width: 599.98px)'
const openNow = () => (window.matchMedia(PHONE).matches ? d.value.open_mobile === true : d.value.open_desktop !== false)
onMounted(() => { state.value = openNow() ? 'open' : 'closed' })
function toggle() {
  const open = state.value === 'auto' ? openNow() : state.value === 'open'
  state.value = open ? 'closed' : 'open'
}

const lines = computed(() => {
  const totals = c?.displayCart?.totals || {}
  const out = [{ key: 'sub', label: t('Subtotal'), amount: formatCurrency(totals.total_items || '0') }]
  const rates = c?.displayCart?.shipping_rates?.[0]?.shipping_rates || []
  if (c?.needsShipping && rates.length && totals.total_shipping != null) {
    out.push({ key: 'ship', label: t('Shipping'), amount: Number(totals.total_shipping) > 0 ? formatCurrency(totals.total_shipping) : t('Free') })
  }
  if (Number(c?.cartTotalDiscount) > 0) out.push({ key: 'disc', label: t('Discount'), amount: `−${formatCurrency(c.cartTotalDiscount)}` })
  return out
})
</script>

<style scoped>
.co-sum__head {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: start; cursor: pointer;
}
.co-sum__title { margin: 0; }
.co-sum__arrow { transition: transform .2s ease; }
.co-sum__head-total { margin-inline-start: auto; font-weight: 600; }
.co-sum__body { margin-top: 12px; }

/* Closed: by a click, or until then by the owner's choice for this screen size. */
.co-sum--closed .co-sum__body,
.co-sum--auto.co-sum--d-closed .co-sum__body { display: none; }
.co-sum--open .co-sum__arrow,
.co-sum--auto:not(.co-sum--d-closed) .co-sum__arrow { transform: rotate(180deg); }
@media (max-width: 599.98px) {
  .co-sum--auto .co-sum__body { display: none; }
  .co-sum--auto .co-sum__arrow { transform: none; }
  .co-sum--auto.co-sum--m-open .co-sum__body { display: block; }
  .co-sum--auto.co-sum--m-open .co-sum__arrow { transform: rotate(180deg); }
}

.co-sum__items { display: flex; flex-direction: column; gap: 12px; }
.co-sum__item { display: flex; align-items: center; gap: 12px; }
.co-sum__photo { position: relative; flex: none; }
.co-sum__qty {
  position: absolute; top: -6px; inset-inline-end: -6px;
  min-width: 20px; height: 20px; padding: 0 5px; border-radius: 10px;
  background: rgba(0, 0, 0, .65); color: #fff; font-size: 12px; line-height: 20px; text-align: center;
}
.co-sum__name { flex: 1; min-width: 0; }
.co-sum__amount { flex: none; }
.co-sum__coupon { margin-top: 14px; }
.co-sum__lines { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(127, 127, 127, .25); }
.co-sum__line { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.co-sum__total { margin-top: 4px; }
</style>
