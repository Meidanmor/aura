<template>
  <CheckoutPart v-if="shown" :data="f.d.value" :default-title="t('Create an account')" class="auth-form-block">
    <p v-if="!f.site.value.signup" class="auth-form-block__done">{{ t('Sign-up is off, so visitors don\'t see this form. Turn it on in Store builder → My account.') }}</p>
    <p v-else-if="f.isIn.value" class="auth-form-block__done">
      {{ f.user.value?.first_name ? t('You\'re signed in as {name}.', { name: f.user.value.first_name }) : t('You\'re signed in.') }}
      <router-link to="/my-account">{{ t('My account') }}</router-link>
    </p>
    <!-- Kept mounted (v-show): the sign-in form marks the customer signed in before it says it's done. -->
    <div v-show="f.site.value.signup && !f.isIn.value">
      <SignupForm
          :field-look="f.d.value.field_look || 'filled'"
          :button-label="f.d.value.button_label || ''"
          :button-bg="f.buttonBg.value"
          :button-text="f.buttonText.value"
          @signup-success="f.done"
      />
      <template v-if="f.google.value">
        <div class="auth-form-block__or"><span>{{ t('OR') }}</span></div>
        <GoogleLoginButton :return-to="f.returnTo.value" @login-success="f.done" />
      </template>
    </div>
  </CheckoutPart>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import SignupForm from 'src/components/account/SignupForm.vue'
import GoogleLoginButton from 'src/components/account/GoogleLoginButton.vue'
import CheckoutPart from '../shop/CheckoutPart.vue'
import { useAuthForm } from './auth-form.js'
import { isEditorMode } from 'src/utils/config-loader.js'
import { useI18n } from 'src/i18n/index.js'

/** "Sign Up Form" (any page): makes an account. Nothing while the store's sign-up is off (a note in the Store builder). */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const { t } = useI18n()
const f = useAuthForm(() => props.data)
const editor = ref(false)
onMounted(() => { editor.value = isEditorMode() })
const shown = computed(() => !f.hidden.value && (f.site.value.signup || editor.value))
</script>
