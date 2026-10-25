<template>
  <CheckoutPart v-if="isIn && shown" :data="d" :default-title="t('My Orders')" class="account-orders-block">
    <p v-if="user?.sample" class="account-sample-note">{{ t('Customers see their orders here.') }}</p>
    <OrdersSection v-else :empty-text="d.empty_text || ''" />
  </CheckoutPart>
</template>

<script setup>
import { computed } from 'vue'
import OrdersSection from 'src/components/account/OrdersSection.vue'
import CheckoutPart from '../shop/CheckoutPart.vue'
import { useAccountView } from 'src/composables/useAccount.js'
import { usePartShown } from './account-parts.js'
import { useI18n } from 'src/i18n/index.js'

/** "Account Orders" (My account): the customer's orders. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const { t } = useI18n()
const d = computed(() => props.data.data || {})
const { user, signedIn: isIn } = useAccountView()
const shown = usePartShown(() => d.value, 'orders')
</script>
