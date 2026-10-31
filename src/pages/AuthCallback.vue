<template>
  <q-page class="q-pa-md flex flex-center">
    <q-spinner size="3em" color="secondary" />
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useSeoMeta } from 'src/composables/useSeo.js'
import { useRouter } from 'vue-router'
import cart from 'src/stores/cart.js'
import { setLoggedIn, refreshNonce } from 'src/composables/useApiFetch.js'
import wishlist from 'src/stores/wishlist.js'
import { setUser } from 'src/stores/user.js'
import { takeGoogleState } from 'src/utils/google-state.js'
import { useI18n } from 'src/i18n/index.js'

const router = useRouter()
const $q = useQuasar()
const { t } = useI18n()
useSeoMeta({ noindex: true })

function fail (message, back = '/') {
  $q.notify({ type: 'warning', message: t(message), timeout: 6000 })
  router.replace(back)
}

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  // A sign-in this tab started (see GoogleLoginButton), else nothing happens.
  const back = takeGoogleState(params.get('state'))

  if (back === null) {
    fail('Google sign-in didn\'t finish. Please try again.')
    return
  }
  if (!code) {
    // The shopper chose Cancel on Google's page (error=access_denied): quietly back.
    if (params.get('error') === 'access_denied') router.replace(back)
    else fail('Google sign-in didn\'t finish. Please try again.', back)
    return
  }

  try {
    const res = await fetch('/wp-json/qwoo/v1/google-login-redirect', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      // Google swaps the code only for the same return address it was given.
      body: JSON.stringify({ code, redirect_uri: `${window.location.origin}/auth/callback` })
    })
    const data = await res.json()

    if (data.success) {
      if (data.user) setUser(data.user)
      setLoggedIn(true)
      await refreshNonce()
      await cart.mergeLocalCartWithServer()
      await wishlist.mergeGuestWishlistOnLogin()
      router.replace(back)
    } else {
      fail(data.code === 'qwoo_signup_off' || data.code === 'qwoo_google_off' ? data.message : 'Google sign-in didn\'t work. Please try again, or sign in with your email.', back)
    }
  } catch {
    fail('Google sign-in didn\'t work. Please try again, or sign in with your email.', back)
  }
})
</script>
