<template>
  <q-form class="signup-form" @submit.prevent="signup">
    <!-- Honeypot: real users never see or fill this. -->
    <div class="hp-field" aria-hidden="true">
      <label :for="`signup-website-${uid}`">{{ t('Website') }}</label>
      <input :id="`signup-website-${uid}`" v-model="honeypotField" type="text" name="website" tabindex="-1" autocomplete="off" />
    </div>

    <div class="signup-form__names">
      <q-input v-model="firstName" :label="t('First Name')" v-bind="look" autocomplete="given-name" maxlength="60" :disable="loading" />
      <q-input v-model="lastName" :label="t('Last Name')" v-bind="look" autocomplete="family-name" maxlength="60" :disable="loading" />
    </div>
    <q-input v-model="email" type="email" :label="t('Email')" v-bind="look" autocomplete="email" :disable="loading"
             :rules="[(v) => /^\S+@\S+\.\S+$/.test(v || '') || t('Please enter a valid email address.')]" lazy-rules />
    <q-input v-model="password" type="password" :label="t('Password')" v-bind="look" autocomplete="new-password" :disable="loading"
             :hint="t('At least 8 characters')"
             :rules="[(v) => (v || '').length >= 8 || t('Password must be at least 8 characters.')]" lazy-rules />

    <q-btn
        :label="buttonLabel || t('Create account')"
        type="submit"
        :color="buttonBg ? undefined : 'secondary'"
        :style="buttonStyle"
        class="signup-form__btn"
        no-caps
        unelevated
        :loading="loading"
    />
    <div v-if="error" class="text-negative q-mt-md" role="alert">{{ error }}</div>
  </q-form>
</template>

<script setup>
import { computed, ref, useId } from 'vue'
import cart from 'src/stores/cart.js'
import wishlist from 'src/stores/wishlist.js'
import { refreshNonce } from 'src/composables/useApiFetch.js'
import { useHoneypot } from 'src/composables/useHoneypot.js'
import { useI18n } from 'src/i18n/index.js'

/**
 * Making an account (Sign Up Form block): name, email and password, then the
 * customer is signed in (POST /qwoo/v1/register). The store refuses while
 * sign-up is off, so the form isn't shown then (the block checks).
 */
const props = defineProps({
  fieldLook: { type: String, default: 'filled' },
  buttonLabel: { type: String, default: '' },
  buttonBg: { type: String, default: '' },
  buttonText: { type: String, default: '' },
})
const emit = defineEmits(['signup-success'])
const { t } = useI18n()
const uid = useId()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const { honeypotField, isLikelyBot } = useHoneypot()

const look = computed(() => (['filled', 'outlined', 'borderless'].includes(props.fieldLook) ? { [props.fieldLook]: true } : {}))
const buttonStyle = computed(() => ({
  ...(props.buttonBg ? { background: props.buttonBg } : {}),
  ...(props.buttonText ? { color: props.buttonText } : {}),
}))

async function signup() {
  error.value = ''
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    error.value = t("You're offline. Connect to the internet to sign in.")
    return
  }
  if (isLikelyBot()) {
    error.value = t('Something went wrong. Please try again.')
    return
  }
  loading.value = true
  try {
    const res = await fetch('/wp-json/qwoo/v1/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: firstName.value.trim(),
        last_name: lastName.value.trim(),
        email: email.value.trim(),
        password: password.value,
        website: honeypotField.value,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!data.success) {
      error.value = t(data.message || 'Something went wrong. Please try again.')
      return
    }
    await refreshNonce()
    // The guest's cart and wishlist move into the new account.
    await cart.mergeLocalCartWithServer()
    await wishlist.mergeGuestWishlistOnLogin()
    emit('signup-success', data.user)
  } catch (err) {
    console.error('Sign-up error:', err)
    error.value = t('A server error occurred. Please try again later.')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.signup-form { display: flex; flex-direction: column; gap: 10px; }
.signup-form__names { display: flex; gap: 10px; }
.signup-form__names > * { flex: 1 1 0; min-width: 0; }
.signup-form__btn { align-self: flex-start; margin-top: 6px; }
@media (max-width: 480px) {
  .signup-form__names { flex-direction: column; }
}
</style>
