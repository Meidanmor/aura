<template>
  <div v-if="product" class="lt-align" :style="alignVars">
    <q-btn
        v-if="product.is_in_stock === false"
        class="lt-cart-btn"
        :class="{ 'lt-cart-btn--full': !!d.full_width }"
        v-bind="look"
        :style="btnVars"
        :label="t('Out of stock')"
        disable
        no-caps
    />
    <q-btn
        v-else-if="hasOptions"
        class="lt-cart-btn"
        :class="btnClass"
        v-bind="look"
        :style="btnVars"
        :to="url"
        :icon="icon"
        :round="iconOnly"
        :aria-label="iconOnly ? (d.options_text || t('Choose options')) : undefined"
        no-caps
    ><span v-if="!iconOnly" v-bind="labelBind">{{ d.options_text || t('Choose options') }}</span></q-btn>
    <q-btn
        v-else
        class="lt-cart-btn"
        :class="btnClass"
        v-bind="look"
        :style="btnVars"
        :loading="adding"
        :icon="icon"
        :round="iconOnly"
        :aria-label="iconOnly ? (d.text || t('Add to cart')) : undefined"
        no-caps
        @click.prevent.stop="add"
    ><span v-if="!iconOnly" v-bind="labelBind">{{ d.text || t('Add to cart') }}</span></q-btn>
  </div>
</template>

<script setup>
/**
 * A product card's Add to cart button (lp_cart): adds simple products,
 * opens the page of products with options, and says so when sold out.
 * Styles: LoopCard.vue.
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { gradientOf } from 'src/utils/gradient.js'
import { matAdd, matShoppingBag, matShoppingCart } from '@quasar/extras/material-icons'
import cart from 'src/stores/cart.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { useLoopItem, loopItemUrl } from './loop-item.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { alignToText, setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'

const props = defineProps({
  data: { type: Object, required: true },
})
const loop = useLoopItem()
const router = useRouter()
const d = computed(() => props.data.data || {})
const product = computed(() => (loop?.value?.type === 'product' ? loop.value.item : null))
const hasOptions = computed(() => ['variable', 'grouped', 'external'].includes(product.value?.type) || product.value?.has_options === true)
const url = computed(() => loopItemUrl('product', product.value))
const labelBind = computed(() => textStyle(d.value, tsKeys('label'), 'buttons'))
const look = computed(() => {
  switch (d.value.button_style) {
    case 'secondary': return { color: 'secondary', unelevated: true }
    case 'outline': return { color: 'secondary', outline: true }
    case 'link': return { color: 'secondary', flat: true, dense: true, padding: '2px 0' }
    default: return { color: 'primary', unelevated: true }
  }
})
const alignVars = computed(() => {
  const v = {}
  setResponsiveVar(v, '--lt-ta', d.value.align, alignToText)
  return v
})
// Content → Icon (and "Icon only": a round button, its text kept for screen readers).
const ICONS = { add: matAdd, bag: matShoppingBag, cart: matShoppingCart }
const icon = computed(() => ICONS[d.value.icon] || undefined)
const iconOnly = computed(() => !!icon.value && !!d.value.icon_only)
const btnClass = computed(() => ({ 'lt-cart-btn--full': !!d.value.full_width && !iconOnly.value, 'lt-cart-btn--round': iconOnly.value }))
const btnVars = computed(() => {
  const v = {}
  const r = toCssLength(d.value.radius)
  if (r) v['--lt-btn-radius'] = r
  const size = toCssLength(d.value.round_size)
  if (size) v['--lt-btn-round'] = size
  const iconSize = toCssLength(d.value.icon_size)
  if (iconSize) v['--lt-btn-icon'] = iconSize
  const lined = d.value.button_style === 'outline' || d.value.button_style === 'link'
  // A second colour makes a filled button a gradient.
  const bg = lined ? resolveGlobalColor(d.value.btn_bg) : gradientOf(d.value.btn_bg, d.value.btn_bg2, d.value.gradient_angle ?? 90)
  if (bg) v[lined ? 'color' : 'background'] = `${bg} !important`
  const border = resolveGlobalColor(d.value.btn_border)
  if (border) v['--lt-btn-border'] = border
  return v
})
const adding = ref(false)
async function add() {
  if (!product.value || adding.value) return
  adding.value = true
  try {
    // "Buy now": into the cart without opening it, then to checkout.
    const buyNow = d.value.action === 'buy_now'
    await cart.add(product.value.id, 1, null, {}, null, null, !buyNow)
    if (buyNow) await router.push('/checkout')
  } finally {
    adding.value = false
  }
}
</script>
