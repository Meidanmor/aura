<template>
  <CheckoutPart v-if="!f.hidden.value" :data="f.d.value" :default-title="t('Sign in')" class="auth-form-block">
    <p v-if="f.isIn.value" class="auth-form-block__done">
      {{ f.user.value?.first_name ? t('You\'re signed in as {name}.', { name: f.user.value.first_name }) : t('You\'re signed in.') }}
      <router-link to="/my-account">{{ t('My account') }}</router-link>
    </p>
    <!-- Kept mounted (v-show): the sign-in form marks the customer signed in before it says it's done. -->
    <div v-show="!f.isIn.value">
      <LoginForm
          plain
          :field-look="f.d.value.field_look || 'filled'"
          :show-remember="f.d.value.show_remember !== false"
          :show-forgot="f.d.value.show_forgot !== false"
          :button-label="f.d.value.button_label || ''"
          :button-bg="f.buttonBg.value"
          :button-text="f.buttonText.value"
          @login-success="f.done"
      />
      <template v-if="f.google.value">
        <div class="auth-form-block__or"><span>{{ t('OR') }}</span></div>
        <GoogleLoginButton :return-to="f.returnTo.value" @login-success="f.done" />
      </template>
    </div>
  </CheckoutPart>
</template>

<script setup>
import LoginForm from 'src/components/account/LoginForm.vue'
import GoogleLoginButton from 'src/components/account/GoogleLoginButton.vue'
import CheckoutPart from '../shop/CheckoutPart.vue'
import { useAuthForm } from './auth-form.js'
import { useI18n } from 'src/i18n/index.js'

/** "Sign In Form" (any page): username or email and password, and Google when the store has it. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const { t } = useI18n()
const f = useAuthForm(() => props.data)
</script>

<style>
.auth-form-block__done { margin: 0; }
.auth-form-block__done a { color: var(--q-secondary); text-decoration: underline; }
.auth-form-block__or { display: flex; align-items: center; gap: 10px; margin: 14px 0; font-size: 14px; opacity: .8; }
.auth-form-block__or::before, .auth-form-block__or::after { content: ''; flex: 1 1 0; height: 1px; background: currentColor; opacity: .3; }
.auth-form-block .google-login-btn-wrap button { width: 100%; }
</style>
