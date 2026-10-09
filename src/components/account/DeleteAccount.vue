<template>
  <section class="delete-account q-mt-xl" aria-labelledby="delete-account-title">
    <h3 id="delete-account-title" class="text-h6 q-mb-sm">Delete my account</h3>
    <p class="q-mb-sm">
      Your account, saved details and your name, email, phone and addresses on past orders are removed for good.
      We'll email you a link to confirm.
    </p>
    <p v-if="sentTo" class="text-positive" role="status">Check your inbox ({{ sentTo }}) and open the link within an hour to delete your account.</p>
    <template v-else>
      <q-btn v-if="!asking" outline color="negative" label="Delete my account" no-caps @click="asking = true" />
      <div v-else class="row items-center q-gutter-sm">
        <span>Send the confirmation email?</span>
        <q-btn color="negative" label="Yes, email me the link" no-caps :loading="busy" @click="request" />
        <q-btn flat label="Cancel" no-caps @click="asking = false" />
      </div>
    </template>
    <p v-if="error" class="text-negative q-mt-sm" role="alert">{{ error }}</p>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { fetchWithToken } from 'src/composables/useApiFetch.js'

/** Asks the store to email a link that confirms deleting the account. */
const asking = ref(false)
const busy = ref(false)
const error = ref('')
const sentTo = ref('')

async function request() {
  busy.value = true
  error.value = ''
  try {
    const res = await fetchWithToken('/wp-json/qwoo/v1/account/delete-request', { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.message || 'Something went wrong. Please try again.')
    sentTo.value = json.email || 'your email'
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.delete-account { border-top: 1px solid rgba(0, 0, 0, .12); padding-top: 24px; max-width: 640px; }
</style>
