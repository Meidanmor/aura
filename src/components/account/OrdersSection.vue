<template>
  <div>

    <div v-if="orders && orders.length > 0">
    <q-card dense>
      <q-expansion-item
        v-for="order in orders"
        :key="order.id"
        :label="t('Order #{number}', { number: order.number })"
        :caption="`${order.date_created} | ${t('Status:')} ${statusLabel(order.status)}`"
        :icon="matShoppingBag"
        :expand-icon="matKeyboardArrowDown"
        header-class="text-primary text-bold"
        class="q-mb-sm"
        group="somegroup"
        expand-separator
      >
        <div class="q-mt-sm q-pa-md">
          <div class="text-body2 ink-soft q-mb-sm">
            {{ t('Total: {total} {currency}', { total: order.total, currency: order.currency }) }}
          </div>
          <!-- The courier's tracking and the HFD pickup point (Qwoo_Couriers on the store). -->
          <TrackingLine v-if="order.tracking" :tracking="order.tracking" />
          <div v-if="order.pickup_point" class="q-mb-sm"><strong>{{ t('Pickup point') }}:</strong> {{ order.pickup_point.name }}<template v-if="order.pickup_point.address">, {{ order.pickup_point.address }}</template></div>
          <button v-if="canAsk" type="button" class="help-link q-mb-sm" @click="openHelp({ view: 'write', order: order.number })">{{ t('Help with this order') }}</button>

          <q-table
            :rows="Object.values(order.items)"
            :columns="columns"
            row-key="name"
            dense
            flat
            bordered
            hide-bottom
          >

            <template v-slot:body-cell-thumbnail="props">
              <q-td :props="props">
                <q-img
                  :src="props.row.thumbnail"
                  style="width: 70px; height: 70px;"
                  spinner-color="grey-5"
                  ratio="1"
                  fit="cover"
                  class="rounded-borders"
                />
              </q-td>
            </template>
          </q-table>
        </div>
      </q-expansion-item>
    </q-card>

    </div>
    <!-- The list couldn't load (2026-11-26): not "No orders yet". -->
    <div v-else-if="loadFailed" role="alert">{{ t('We couldn\'t load your orders. Please try again.') }} <q-btn flat dense no-caps color="secondary" :label="t('Try again')" @click="load" /></div>
    <div v-else-if="orders && orders.length === 0 && emptyText">{{ emptyText }}</div>
    <div v-else-if="orders && orders.length === 0">{{ t('No orders yet.') }} <router-link to="/products/">{{ t('explore our products') }}</router-link> {{ t('to start your first order!') }}</div>
    <div v-else> <q-spinner color="secondary" size="2em" /> </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { matShoppingBag, matKeyboardArrowDown } from '@quasar/extras/material-icons'
import { fetchWithToken } from 'src/composables/useApiFetch.js'
import { useI18n } from 'src/i18n/index.js'
import { helpConfig, openHelp } from 'src/composables/useHelp.js'
import TrackingLine from './TrackingLine.vue'

// The store's Help button is on: an order can be asked about (known in the browser only).
const canAsk = ref(false)
onMounted(() => { canAsk.value = !!helpConfig()?.write })

const { t } = useI18n()
// The Account Orders block's own text for no orders ('' = the built-in one).
defineProps({ emptyText: { type: String, default: '' } })


const orders = ref(null)
const columns = [
  {
    name: 'thumbnail',
    label: '',
    align: 'left',
    field: 'thumbnail',
  },
  {
    name: 'name',
    label: t('Product'),
    align: 'left',
    field: 'name',
  },
  {
    name: 'quantity',
    label: t('Qty'),
    align: 'center',
    field: 'quantity',
  },
  {
    name: 'total',
    label: t('Total'),
    align: 'right',
    field: 'total',
  }
]

// WooCommerce's order states in words (was the raw slug, "processing").
const STATUS = { pending: 'Pending payment', processing: 'Processing', 'on-hold': 'On hold', completed: 'Completed', cancelled: 'Cancelled', refunded: 'Refunded', failed: 'Failed', 'checkout-draft': 'Draft' }
function statusLabel(s) {
  return STATUS[s] ? t(STATUS[s]) : String(s || '')
}
const loadFailed = ref(false)
async function load() {
  loadFailed.value = false
  try {
    const res = await fetchWithToken('/wp-json/qwoo/v1/my-orders')
    if (!res.ok) throw new Error(String(res.status))
    const list = await res.json()
    orders.value = Array.isArray(list) ? list : []
  } catch {
    loadFailed.value = true
  }
}
onMounted(load)
</script>
<style>
.q-expansion-item__container.relative-position .q-icon,
.q-expansion-item__container.relative-position .q-item__label {
    fill: var(--q-secondary);
    color: var(--q-secondary);
}
</style>