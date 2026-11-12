<template>
  <!-- My account → Gift cards shows here too (every store's account page has this block). -->
  <CheckoutPart v-if="isIn && shown && gifts" :data="{ ...d, title: '' }" :default-title="t('Gift cards')" class="account-orders-block account-giftcards">
    <p v-if="user?.sample" class="account-sample-note">{{ t('Customers see their gift cards here.') }}</p>
    <GiftCardsSection v-else />
  </CheckoutPart>
  <!-- My account → Messages: the shopper's conversations with the store. -->
  <CheckoutPart v-else-if="isIn && shown && msgs" :data="{ ...d, title: '' }" :default-title="t('Messages')" class="account-orders-block account-messages">
    <p v-if="user?.sample" class="account-sample-note">{{ t('Customers see their messages to you here.') }}</p>
    <MessagesSection v-else />
  </CheckoutPart>
  <CheckoutPart v-else-if="isIn && shown" :data="d" :default-title="t('My Orders')" class="account-orders-block">
    <p v-if="user?.sample" class="account-sample-note">{{ t('Customers see their orders here.') }}</p>
    <OrdersSection v-else :empty-text="d.empty_text || ''" />
  </CheckoutPart>
</template>

<script setup>
import { computed, inject } from 'vue'
import OrdersSection from 'src/components/account/OrdersSection.vue'
import GiftCardsSection from 'src/components/account/GiftCardsSection.vue'
import MessagesSection from 'src/components/account/MessagesSection.vue'
import CheckoutPart from '../shop/CheckoutPart.vue'
import { useAccountView } from 'src/composables/useAccount.js'
import { usePartShown } from './account-parts.js'
import { useI18n } from 'src/i18n/index.js'

/** "Account Orders" (My account): the customer's orders. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const { t } = useI18n()
const d = computed(() => props.data.data || {})
const { user, signedIn: isIn } = useAccountView()
const shown = usePartShown(() => d.value, ['orders', 'giftcards', 'messages'])
const accountPage = inject('accountPage', null)
const gifts = computed(() => accountPage?.part === 'giftcards')
const msgs = computed(() => accountPage?.part === 'messages')
</script>
