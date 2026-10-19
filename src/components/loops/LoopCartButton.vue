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
        :class="{ 'lt-cart-btn--full': !!d.full_width }"
        v-bind="look"
        :style="btnVars"
        :to="url"
        no-caps
    ><span v-bind="labelBind">{{ d.options_text || t('Choose options') }}</span></q-btn>
    <q-btn
        v-else
        class="lt-cart-btn"
        :class="{ 'lt-cart-btn--full': !!d.full_width }"
        v-bind="look"
        :style="btnVars"
        :loading="adding"
        no-caps
        @click.prevent.stop="add"
    ><span v-bind="labelBind">{{ d.text || t('Add to cart') }}</span></q-btn>
  </div>
</template>

<script setup>
/**
 * A product card's Add to cart button (lp_cart): adds simple products,
 * opens the page of products with options, and says so when sold out.
 * Styles: LoopCard.vue.
 */
import { computed, ref } from 'vue'
import cart from 'src/stores/cart.js'
import { useLoopItem, loopItemUrl } from './loop-item.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { alignToText, setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'

const props = defineProps({
  data: { type: Object, required: true },
})
const loop = useLoopItem()
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
const btnVars = computed(() => {
  const r = toCssLength(d.value.radius)
  return r ? { '--lt-btn-radius': r } : {}
})
const adding = ref(false)
async function add() {
  if (!product.value || adding.value) return
  adding.value = true
  try {
    await cart.add(product.value.id, 1)
  } finally {
    adding.value = false
  }
}
</script>
