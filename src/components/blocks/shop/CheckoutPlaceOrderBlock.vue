<template>
  <component :is="d.card === false ? 'div' : QCard" v-if="c?.ready" class="checkout-place-order" :class="{ 'is-full': d.full_width, 'q-pa-md': d.card !== false }">
    <q-card-section v-if="d.show_total !== false">
      <div v-if="c.couponApplied">{{ t('Total discount: {amount}', { amount: formatCurrency(c.cartTotalDiscount) }) }}</div>
      <div class="text-h6">{{ t('Total:') }} <span v-if="c.couponApplied"><del>{{ formatCurrency(Number(c.cartTotalDiscount) + Number(c.cartTotal)) }}</del></span> {{ formatCurrency(c.cartTotal) }}</div>
    </q-card-section>
    <q-card-section v-if="(c.allowSignup && c.isLoggedIn === false) || c.termsRequired" class="checkout-agree" :class="{ 'q-pt-none': d.show_total !== false }">
      <q-checkbox v-if="c.allowSignup && c.isLoggedIn === false" v-model="c.createAccount" color="secondary" :label="t('Create an account (we\'ll email you a link to set your password)')" />
      <q-checkbox v-if="c.termsRequired" v-model="c.agreeTerms" color="secondary">
        <span>
          {{ t('I have read and agree to the') }}
          <template v-if="c.legal.terms"><router-link :to="c.legal.terms" target="_blank" @click.stop>{{ t('terms and conditions') }}</router-link></template>
          <template v-if="c.legal.terms && c.legal.privacy"> {{ t('and the') }} </template>
          <template v-if="c.legal.privacy"><router-link :to="c.legal.privacy" target="_blank" @click.stop>{{ t('privacy policy') }}</router-link></template>
          {{ t('of this store. *') }}
        </span>
      </q-checkbox>
    </q-card-section>
    <q-card-actions>
      <q-btn class="place-order-btn" :label="d.button_label || t('Place Order')" :color="buttonBg ? undefined : 'secondary'" :style="buttonColors" :disable="c.cart.state.offline" @click="c.placeOrder" />
    </q-card-actions>
  </component>
</template>

<script setup>
import { computed, inject } from 'vue'
import { QCard } from 'quasar'
import { formatCurrency } from 'src/utils/formatters.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'

/** "Place Order" (checkout page template): the total (unless an Order Totals block shows it), the account and terms boxes, and the button. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('checkoutPage', null)
const d = computed(() => props.data.data || {})
const buttonBg = computed(() => resolveGlobalColor(d.value.button_bg))
const buttonColors = computed(() => ({ ...(buttonBg.value ? { background: buttonBg.value } : {}), ...(d.value.button_text ? { color: resolveGlobalColor(d.value.button_text) } : {}) }))
</script>

<style scoped>
.is-full .place-order-btn { width: 100%; }
</style>
