<template>
  <CheckoutPart v-if="user && shown" :data="d" :default-title="t('Account Details')" class="account-details-block">
    <AccountDetails
        :user="user"
        :field-look="d.field_look || 'filled'"
        :button-bg="color(d.button_bg)"
        :button-text="color(d.button_text)"
    />
    <SavedAddresses v-if="d.show_addresses !== false" :user="user" :look="look" />
    <DeleteAccount v-if="d.show_delete !== false" />
  </CheckoutPart>
</template>

<script setup>
import { computed } from 'vue'
import AccountDetails from 'src/components/account/AccountDetails.vue'
import DeleteAccount from 'src/components/account/DeleteAccount.vue'
import SavedAddresses from 'src/components/account/SavedAddresses.vue'
import CheckoutPart from '../shop/CheckoutPart.vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { useAccountView } from 'src/composables/useAccount.js'
import { usePartShown } from './account-parts.js'
import { useI18n } from 'src/i18n/index.js'

/** "Account Details" (My account): name and email, saved addresses, and deleting the account. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const { t } = useI18n()
const d = computed(() => props.data.data || {})
const { user } = useAccountView()
const shown = usePartShown(() => d.value, 'details')
const color = (v) => resolveGlobalColor(v) || ''
const look = computed(() => { const l = d.value.field_look || 'filled'; return ['filled', 'outlined', 'borderless'].includes(l) ? { [l]: true } : {} })
</script>
