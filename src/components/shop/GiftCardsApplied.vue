<template>
  <div v-if="cards.length" class="gc-applied" :class="`gc-applied--${mode}`">
    <div v-for="c in cards" :key="c.code" class="gc-applied__row">
      <span>{{ t('Gift card ••••{last4}', { last4: c.last4 }) }}</span>
      <span class="gc-applied__amount" dir="ltr">−{{ formatCurrency(c.amount) }}</span>
      <q-btn v-if="mode === 'chips'" flat dense no-caps color="negative" :label="t('Remove')" :loading="removing === c.code" @click="remove(c.code)" />
    </div>
    <div v-if="mode === 'chips'" class="gc-applied__left">
      <span v-for="c in cards.filter((x) => Number(x.balance) > Number(x.amount))" :key="c.code">{{ t('{amount} will stay on ••••{last4}.', { amount: formatCurrency(String(Number(c.balance) - Number(c.amount))), last4: c.last4 }) }}</span>
    </div>
    <div v-if="error" class="text-negative text-caption">{{ error }}</div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import cart from 'src/stores/cart'
import { formatCurrency } from 'src/utils/formatters.js'
import { t } from 'src/i18n/index.js'

/**
 * The gift cards paying for the cart (the store's extensions.qwoo_giftcard):
 * "lines" in the totals, "chips" (with Remove and what stays on the card) by
 * the code field.
 */
defineProps({ mode: { type: String, default: 'lines' } })
const cards = computed(() => cart.state.cart_array?.extensions?.qwoo_giftcard?.applied || [])
const removing = ref('')
const error = ref('')
async function remove(code) {
  removing.value = code
  error.value = ''
  try {
    await cart.removeGiftCard(code)
  } catch (e) {
    error.value = e.message
  } finally {
    removing.value = ''
  }
}
</script>

<style scoped>
.gc-applied { display: grid; gap: 4px; margin: 8px 0; }
.gc-applied__row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.gc-applied--chips .gc-applied__row { justify-content: flex-start; }
.gc-applied__amount { font-variant-numeric: tabular-nums; }
.gc-applied__left { font-size: 13px; opacity: .75; display: grid; }
</style>
