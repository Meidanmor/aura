<template>
  <div v-if="c && c.isLoggedIn === false && c.checkoutReady && c.itemsCount !== '0'">
    <q-expansion-item
        :label="d.label || t('Have an account?')"
        header-class="text-bold cursor-pointer"
        class="q-mb-sm"
        :expand-icon="matKeyboardArrowDown"
        expand-separator
    >
      <div class="account-login-container q-mb-md">
        <LoginForm @login-success="c.onLogin" />
        <span v-if="c.googleLoginEnabled" class="flex q-mb-sm q-mt-sm text-h6">{{ t('OR') }}</span>
        <GoogleLoginButton @login-success="c.onLogin" />
      </div>
    </q-expansion-item>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { matKeyboardArrowDown } from '@quasar/extras/material-icons'
import LoginForm from 'src/components/account/LoginForm.vue'
import GoogleLoginButton from 'src/components/account/GoogleLoginButton.vue'

/** "Sign-in Box" (checkout page template): "Have an account?" for guests. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('checkoutPage', null)
const d = computed(() => props.data.data || {})
</script>
