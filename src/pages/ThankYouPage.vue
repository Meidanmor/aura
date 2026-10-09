<template>
  <q-page class="q-pa-md">
    <div class="container">
      <div v-if="order" class="q-gutter-md">
        <div class="text-h4 text-center">{{ t('Thank you!') }}</div>
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
              <span style="text-decoration:line-through;">{{
                  formatCurrency(order.totals.subtotal, {
                    minorUnit: parseInt(order.totals.currency_minor_unit),
                    symbol: order.totals.currency_symbol,
                    prefix: order.totals.currency_prefix,
                    suffix: order.totals.currency_suffix,
                    decimalSeparator: order.totals.currency_decimal_separator,
                    thousandSeparator: order.totals.currency_thousand_separator,
                  })
                }} </span>
              {{
                formatCurrency(order.totals.total_items, {
                  minorUnit: parseInt(order.totals.currency_minor_unit),
                  symbol: order.totals.currency_symbol,
                  prefix: order.totals.currency_prefix,
                  suffix: order.totals.currency_suffix,
                  decimalSeparator: order.totals.currency_decimal_separator,
                  thousandSeparator: order.totals.currency_thousand_separator,
                })
              }}
            </div>
            <div v-else><strong>{{ t('Subtotal:') }}</strong> {{
                formatCurrency(order.totals.subtotal, {
                  minorUnit: parseInt(order.totals.currency_minor_unit),
                  symbol: order.totals.currency_symbol,
                  prefix: order.totals.currency_prefix,
                  suffix: order.totals.currency_suffix,
                  decimalSeparator: order.totals.currency_decimal_separator,
                  thousandSeparator: order.totals.currency_thousand_separator,
                })
              }}
            </div>
            <div><strong>{{ t('Shipping:') }}</strong> {{
                formatCurrency(order.totals.total_shipping, {
                  minorUnit: parseInt(order.totals.currency_minor_unit),
                  symbol: order.totals.currency_symbol,
                  prefix: order.totals.currency_prefix,
                  suffix: order.totals.currency_suffix,
                  decimalSeparator: order.totals.currency_decimal_separator,
                  thousandSeparator: order.totals.currency_thousand_separator,
                })
              }}
            </div>
            <div><strong>{{ t('Total:') }}</strong> {{
                formatCurrency(order.totals.total_price, {
                  minorUnit: parseInt(order.totals.currency_minor_unit),
                  symbol: order.totals.currency_symbol,
                  prefix: order.totals.currency_prefix,
                  suffix: order.totals.currency_suffix,
                  decimalSeparator: order.totals.currency_decimal_separator,
                  thousandSeparator: order.totals.currency_thousand_separator,
                })
              }}
            </div>
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
                  {{
                    formatCurrency(props.row.totals?.line_total, {
                      minorUnit: parseInt(order.totals.currency_minor_unit),
                      symbol: order.totals.currency_symbol,
                      prefix: order.totals.currency_prefix,
                      suffix: order.totals.currency_suffix,
                      decimalSeparator: order.totals.currency_decimal_separator,
                      thousandSeparator: order.totals.currency_thousand_separator,
                    })
                  }}
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
import { useI18n } from 'src/i18n/index.js'

const { t } = useI18n()

const route = useRoute()
useSeoMeta({ noindex: true })
const order = ref(null)
// Bank details for orders paid by transfer (the owner's details from the store).
const bank = computed(() => order.value && route.query.pm === 'bacs' ? paymentConfig.value?.methods?.bacs || null : null)

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
  } catch (err) {
    console.error(err)
  }
})
</script>
