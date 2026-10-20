<template>
  <div v-if="c?.ready" class="checkout-summary relative-position">
    <div v-if="c.cart.state.loading.cart === true" class="blockUi"></div>
    <!-- Cart Items -->
    <q-card v-if="d.show_items !== false" class="q-mb-md">
      <q-card-section class="q-pa-md">
        <div class="text-h6">{{ t('Your Cart') }}</div>
        <div v-for="item in c.cartItems" :key="item.key" class="checkout-items q-my-sm flex items-center no-wrap">
          <div>
            <q-img v-if="item?.images?.length" :src="item.images[0].src" :alt="item.name" height="100px" width="100px" class="rounded-borders" />
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
      </q-card-section>
    </q-card>

    <!-- Shipping Method -->
    <q-card class="q-mb-md">
      <q-card-section class="q-pa-md">
        <div class="text-h6">{{ t('Choose Shipping Method') }}</div>
        <q-option-group v-model="c.selectedShippingRateId" :options="c.shippingOptions" type="radio" color="secondary" @update:model-value="c.onShippingMethodChange" />
      </q-card-section>
    </q-card>

    <!-- Payment -->
    <q-card class="q-mb-md">
      <q-card-section class="q-pa-md">
        <div class="text-h6">{{ t('Payment Method') }}</div>
        <q-option-group v-model="c.paymentMethod" :options="c.paymentMethods" type="radio" color="secondary" />
        <div v-if="c.paymentNote" class="text-caption text-grey-8 q-my-sm" style="white-space: pre-line">{{ c.paymentNote }}</div>
        <component
            :is="c.paymentComponent"
            v-if="c.paymentComponent"
            :amount="Number(c.displayCart.totals.total_price)"
            :currency="(c.displayCart.totals.currency_code || 'ILS').toLowerCase()"
            @ready="c.onCardReady"
            @wallet-payment="c.submitOrder"
        />
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { computed, inject, toRaw } from 'vue'
import { formatCurrency } from 'src/utils/formatters.js'

/** "Order Summary" (checkout page template): the items, the shipping choice and the payment method. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('checkoutPage', null)
const d = computed(() => props.data.data || {})
</script>

<style scoped>
.checkout-items { gap: 10px; }
</style>
