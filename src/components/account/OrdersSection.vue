<template>
  <div>
    <h2 class="text-h4">{{ t('My Orders') }}</h2>

    <div v-if="orders && orders.length > 0">
    <q-card dense>
      <q-expansion-item
        v-for="order in orders"
        :key="order.id"
        :label="t('Order #{number}', { number: order.number })"
        :caption="`${order.date_created} | Status: ${order.status}`"
        :icon="matShoppingBag"
        :expand-icon="matKeyboardArrowDown"
        header-class="text-primary text-bold"
        class="q-mb-sm"
        group="somegroup"
        expand-separator
      >
        <div class="q-mt-sm q-pa-md">
          <div class="text-body2 text-grey-7 q-mb-sm">
            {{ t('Total: {total} {currency}', { total: order.total, currency: order.currency }) }}
          </div>

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
    <div v-else-if="orders && orders.length === 0">{{ t('No orders yet.') }} <router-link to="/products/">{{ t('explore our products') }}</router-link> {{ t('to start your first order!') }}</div>
    <div v-else> <q-spinner color="secondary" size="2em" /> </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { matShoppingBag, matKeyboardArrowDown } from '@quasar/extras/material-icons'
import { fetchWithToken } from 'src/composables/useApiFetch.js'
import { useI18n } from 'src/i18n/index.js'

const { t } = useI18n()


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

onMounted(async () => {
  const res = await fetchWithToken('/wp-json/qwoo/v1/my-orders');
  orders.value = await res.json();
})
</script>
<style>
.q-expansion-item__container.relative-position .q-icon,
.q-expansion-item__container.relative-position .q-item__label {
    fill: var(--q-secondary);
    color: var(--q-secondary);
}
</style>