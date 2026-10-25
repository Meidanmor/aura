<template>
  <div v-if="c?.ready" class="checkout-items-block relative-position">
    <div v-if="c.cart.state.loading.cart === true" class="blockUi"></div>
    <CheckoutPart :data="d" :default-title="t('Your Cart')">
      <div v-for="item in c.cartItems" :key="item.key" class="checkout-items q-my-sm flex items-center no-wrap" :class="itemText.class" :style="itemText.style">
        <div>
          <q-img v-if="item?.images?.length" :src="item.images[0].src" :alt="item.name" :height="size" :width="size" class="rounded-borders" />
        </div>
        <div class="flex">
          <div class="item-name">
            {{ item.name }}
            <div v-if="item.variation && item.variation.length > 0">
              <div v-for="(variation, index) in item.variation" :key="index">{{ variation.attribute }}: {{ variation.value }}</div>
            </div>
          </div>
          × {{ item.quantity }} - {{ formatCurrency(item.totals?.line_total ?? (parseInt(toRaw(item.prices)?.price || 0) * item.quantity).toString()) }}
        </div>
      </div>
    </CheckoutPart>
  </div>
</template>

<script setup>
import { computed, inject, toRaw } from 'vue'
import { formatCurrency } from 'src/utils/formatters.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { toCssLength } from 'src/composables/useSectionStyle.js'
import CheckoutPart from './CheckoutPart.vue'

/** "Cart Items" (checkout page template): what's being bought. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('checkoutPage', null)
const d = computed(() => props.data.data || {})
const size = computed(() => toCssLength(d.value.image_size) || '100px')
const itemText = computed(() => textStyle(d.value, tsKeys('item')))
</script>

<style scoped>
.checkout-items { gap: 10px; }
</style>
