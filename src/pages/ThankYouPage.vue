<template>
  <q-page class="q-pa-md">
    <div class="container">
      <!-- Grow: waiting for the store to confirm the payment with Grow -->
      <div v-if="growState === 'checking'" class="text-center q-my-xl">
        <q-spinner color="secondary" size="lg"/>
        <div class="q-mt-md">{{ t('Confirming your payment…') }}</div>
      </div>

      <div v-else-if="order" class="q-gutter-md">
        <div class="text-h4 text-center">{{ t('Thank you!') }}</div>
        <q-banner v-if="growState === 'waiting'" class="bg-amber-1 text-black rounded-borders">
          {{ t("We haven't received the payment confirmation yet. If you paid, you'll get an email once it arrives. If not, your order waits for payment.") }}
        </q-banner>
        <div class="text-subtitle1 text-center">
          {{ t('Hey {first_name}. Your order is being processed and will get to you soon! Please check your email inbox at', { first_name: order.billing_address.first_name }) }} <strong>{{ order.billing_address.email }}</strong> {{ t('for more details.') }}
        </div>

        <q-card v-if="bank" class="q-pa-md">
          <q-card-section>
            <div class="text-h6">{{ t('Pay by bank transfer') }}</div>
            <q-separator class="q-my-sm"/>
            <p>{{ t('Your order ships once the transfer arrives. Please use order number') }} <strong>{{ order.id }}</strong> {{ t('as the payment reference.') }}</p>
            <p v-if="bank.instructions" style="white-space: pre-line">{{ bank.instructions }}</p>
            <div v-for="(a, i) in bank.accounts || []" :key="i" class="q-mb-sm">
              <div v-if="a.account_name"><strong>{{ t('Account name:') }}</strong> {{ a.account_name }}</div>
              <div v-if="a.bank_name"><strong>{{ t('Bank:') }}</strong> {{ a.bank_name }}</div>
              <div v-if="a.account_number"><strong>{{ t('Account number:') }}</strong> {{ a.account_number }}</div>
              <div v-if="a.sort_code"><strong>{{ t('Branch:') }}</strong> {{ a.sort_code }}</div>
              <div v-if="a.iban"><strong>{{ t('IBAN:') }}</strong> {{ a.iban }}</div>
              <div v-if="a.bic"><strong>{{ t('BIC / SWIFT:') }}</strong> {{ a.bic }}</div>
            </div>
          </q-card-section>
        </q-card>

        <q-card class="q-pa-md">
          <q-card-section>
            <div class="text-h6">{{ t('Order Summary') }}</div>
            <q-separator class="q-my-sm"/>
            <div><strong>{{ t('Order Number:') }}</strong> {{ order.id }}</div>

            <div v-if="order.totals.total_items === 0 || order.totals.total_items !== order.totals.subtotal"><strong>{{ t('Subtotal:') }}</strong>
              <span style="text-decoration:line-through;">{{ money(order.totals.subtotal, totalsUnit) }} </span>
              {{ money(order.totals.total_items, totalsUnit) }}
            </div>
            <div v-else><strong>{{ t('Subtotal:') }}</strong> {{ money(order.totals.subtotal, totalsUnit) }}</div>
            <div><strong>{{ t('Shipping:') }}</strong> {{ money(order.totals.total_shipping, totalsUnit) }}</div>
            <div><strong>{{ t('Total:') }}</strong> {{ money(order.totals.total_price, totalsUnit) }}</div>
          </q-card-section>

          <q-card-section>
            <div class="text-h6 q-mb-md">{{ t('Products') }}</div>
            <q-table
              :rows="order.items"
              :columns="columns"
              flat
              dense
              row-key="id"
              hide-bottom
            >
              <template v-slot:body-cell-thumbnail="props">
                <q-td>
                  <q-img
                    :src="props.row.images?.[0]?.src"
                    style="width: 100px; height: 100px"
                    spinner-color="grey-5"
                    :alt="props.row.name"
                  />
                </q-td>
              </template>
              <template v-slot:body-cell-total="props">
                <q-td class="text-center">
                  {{ money(props.row.totals?.line_total, storeUnit) }}
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>

      <div v-else class="text-center q-my-xl">
        <q-spinner color="secondary" size="lg"/>
        <div class="q-mt-md">{{ t('Loading your order...') }}</div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import {ref, computed, onMounted} from 'vue'
import {useSeoMeta} from 'src/composables/useSeo.js'
import {useRoute} from 'vue-router'
import {fetchWithToken} from 'src/composables/useApiFetch.js';
import {formatCurrency} from 'src/utils/formatters.js'
import {loadPaymentConfig, paymentConfig} from 'src/payments/config'
import {takeGrowPayment, waitForGrowPayment} from 'src/payments/grow-return'
import { useI18n } from 'src/i18n/index.js'
import { ecommerceOf, eventItem, trackPurchaseOnce } from 'src/utils/custom-code.js'

const { t } = useI18n()

const route = useRoute()
useSeoMeta({ noindex: true })
const order = ref(null)
// Grow payments: '' (not Grow) | 'checking' | 'paid' | 'waiting' (not confirmed after ~30s).
const growState = ref('')
// Bank details for orders paid by transfer (the owner's details from the store).
const bank = computed(() => order.value && route.query.pm === 'bacs' ? paymentConfig.value?.methods?.bacs || null : null)

// WooCommerce's order answer gives line items in the store's decimals but the order totals always
// with 2 (a ₪380 order on a 0-decimal store came out as ₪38,000). The items tell which one the
// totals use, so this keeps working if WooCommerce fixes it.
const storeUnit = computed(() => parseInt(order.value?.totals?.currency_minor_unit, 10) || 0)
const totalsUnit = computed(() => {
  const items = order.value?.items || []
  const sum = items.reduce((n, it) => n + (parseInt(it.totals?.line_subtotal, 10) || 0), 0)
  const sub = parseInt(order.value?.totals?.subtotal, 10) || 0
  if (sum > 0 && sub > 0) {
    const extra = Math.round(Math.log10(sub / sum))
    if (extra >= -4 && extra <= 4) return Math.max(0, storeUnit.value + extra)
  }
  return storeUnit.value
})

function money (amount, minorUnit) {
  const tot = order.value.totals
  return formatCurrency(amount, {
    minorUnit,
    prefix: tot.currency_prefix,
    suffix: tot.currency_suffix,
    decimalSeparator: tot.currency_decimal_separator,
  })
}

const columns = [
  {name: 'thumbnail', label: '', align: 'left', field: 'thumbnail'},
  {name: 'name', label: t('Product'), align: 'center', field: 'name'},
  {name: 'quantity', label: t('Qty'), align: 'center', field: 'quantity'},
  {name: 'total', label: t('Total'), align: 'center', field: 'total'}
]

onMounted(async () => {
  loadPaymentConfig()
  const orderID = route.query.orderId
  const email = route.query.billing_email
  const order_key = route.query.order_key

  // Back from Grow's payment page: the store asks Grow, which can take a few seconds.
  let paidLater = null
  if (String(route.query.pm || '').startsWith('grow_') && orderID && order_key) {
    takeGrowPayment() // paid here: no cart to put back on checkout
    growState.value = 'checking'
    paidLater = waitForGrowPayment(orderID, order_key).then((paid) => { growState.value = paid ? 'paid' : 'waiting'; return paid })
  }

  try {
    const res = await fetchWithToken(
      `/wp-json/wc/store/v1/order/${orderID}?key=${order_key}&billing_email=${email}`,
      {credentials: 'include'}
    )
    if (!res.ok) {
      throw new Error(`Failed to fetch order: ${res.status}`)
    }
    const data = await res.json()
    order.value = data
    // The owner's trackers: the purchase, once per order (a card payment once it's confirmed).
    if (!paidLater || await paidLater) trackPurchase(data)
  } catch (err) {
    console.error(err)
  }
})

function trackPurchase(data) {
  if (!data?.id) return
  const items = (data.items || []).map((item) => eventItem(item, item.quantity, storeUnit.value))
  const total = Number(data.totals?.total_price) / 10 ** totalsUnit.value
  trackPurchaseOnce(data.id, {
    ...ecommerceOf(items, data.totals?.currency_code, Number.isFinite(total) ? total : undefined),
    tax: Number(data.totals?.total_tax || 0) / 10 ** totalsUnit.value,
    shipping: Number(data.totals?.total_shipping || 0) / 10 ** totalsUnit.value,
  })
}
</script>
