<!-- AccountPage.vue -->
<template>
  <div class="q-pa-md">
    <div v-if="deleteLink || deleteDone" class="delete-confirm q-pa-md q-mb-lg" role="region" :aria-label="t('Delete account')">
      <template v-if="deleteDone">
        <h2 class="text-h5 q-mt-none">{{ t('Your account was deleted') }}</h2>
        <p>{{ t('We\'ve removed your account and your personal details. Thank you for shopping with us.') }}</p>
        <q-btn color="secondary" :label="t('Back to the store')" to="/" no-caps />
      </template>
      <template v-else>
        <h2 class="text-h5 q-mt-none">{{ t('Delete your account?') }}</h2>
        <p>{{ t('Your account, saved details and your name, email, phone and addresses on past orders are removed for good. This can\'t be undone.') }}</p>
        <div class="row q-gutter-sm">
          <q-btn color="negative" :label="t('Delete my account')" no-caps :loading="deleteBusy" @click="confirmDelete" />
          <q-btn flat :label="t('Keep my account')" no-caps @click="cancelDelete" />
        </div>
        <p v-if="deleteError" class="text-negative q-mt-sm" role="alert">{{ deleteError }}</p>
      </template>
    </div>
    <div class="container">
      <h2>{{ t('My account') }}</h2>

      <!-- Checking session on mount -->
      <div v-if="sessionLoading">
        <q-spinner color="secondary" size="2em" />
      </div>

      <!-- Not logged in -->
      <div class="account-login-container" v-else-if="!isLoggedIn">
        <LoginForm @login-success="onLogin" />
        <span class="flex q-mb-sm q-mt-sm text-h6" v-if="googleLoginEnabled">{{ t('OR') }}</span>
        <GoogleLoginButton @login-success="onLogin"/>
      </div>

      <!-- Logged in -->
      <div v-else>
        <q-tabs
            @pointerdown.stop
          :right-icon="matChevronRight"
          :left-icon="matChevronLeft"
            :outside-arrows="true"
            :mobile-arrows="true"
          v-model="tab"
          class="account-tabs text-secondary"
          active-bg-color="secondary"
          active-color="primary"
          align="justify"
        >
          <q-tab name="dashboard" :label="t('Dashboard')" />
          <q-tab name="orders"    :label="t('My Orders')" />
          <q-tab name="details"   :label="t('Account Details')" />
          <q-tab name="logout"    :label="t('Logout')" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="tab" animated>

          <q-tab-panel name="dashboard">
            <h2 class="text-h4">{{ t('Dashboard') }}</h2>
            <div v-if="userData">
              {{ t('Welcome, {first_name} {last_name}', { first_name: userData.first_name, last_name: userData.last_name }) }}
            </div>
            <div v-else>
              <q-spinner color="secondary" size="2em" />
            </div>
          </q-tab-panel>

          <q-tab-panel name="orders">
            <OrdersSection />
          </q-tab-panel>

          <q-tab-panel name="details">
            <AccountDetails v-if="userData" :user="userData" />
            <DeleteAccount v-if="userData" />
          </q-tab-panel>

          <q-tab-panel name="logout">
            <q-btn @click="logout" :loading="logoutLoading" :label="t('Logout')" />
            <div v-if="logoutError" class="text-negative q-mt-md">{{ logoutError }}</div>
          </q-tab-panel>

        </q-tab-panels>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchWithToken, setLoggedIn, getWasLoggedIn } from 'src/composables/useApiFetch.js'
import { clearSessionState } from 'src/composables/useSessionCleanup.js'
import { setUser } from 'src/stores/user.js'
import LoginForm          from '../components/account/LoginForm.vue'
import OrdersSection      from '../components/account/OrdersSection.vue'
import AccountDetails     from '../components/account/AccountDetails.vue'
import DeleteAccount      from '../components/account/DeleteAccount.vue'
import { useRoute, useRouter } from 'vue-router'
import GoogleLoginButton  from '../components/account/GoogleLoginButton.vue'
import { matChevronLeft, matChevronRight } from '@quasar/extras/material-icons'
import {useSeoMeta} from "src/composables/useSeo.js";
import { t as i18nT, useI18n } from 'src/i18n/index.js'

const { t } = useI18n()

defineOptions({
  async preFetch ({ ssrContext }) {

    const seo = {
      title: i18nT('My account'),
      description: 'Account page',
      robots: 'index, follow'
    }

    if (ssrContext) {
      // Initialize the state object if it doesn't exist
      ssrContext.seoData = seo
    } else {
      window.__SEO_DATA__ = seo;
    }
  }
})

useSeoMeta({ noindex: true })

const googleLoginEnabled = !!import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID

const tab            = ref('dashboard')

// The link from the "Delete your account?" email: ?delete_account=token&u=user id.
const route  = useRoute()
const router = useRouter()
const deleteLink    = ref(null) // { token, u } while confirming
const deleteBusy    = ref(false)
const deleteError   = ref('')
const deleteDone    = ref(false)
if (/^[a-f0-9]{32}$/.test(String(route.query.delete_account || '')) && /^\d+$/.test(String(route.query.u || ''))) {
  deleteLink.value = { token: String(route.query.delete_account), u: Number(route.query.u) }
}
async function confirmDelete() {
  deleteBusy.value  = true
  deleteError.value = ''
  try {
    const res = await fetchWithToken('/wp-json/qwoo/v1/account/delete-confirm', {
      method: 'POST',
      body: JSON.stringify(deleteLink.value),
    }, null, { skipNonceRetry: true })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.message || t('Something went wrong. Please try again.'))
    deleteDone.value = true
    userData.value   = null
    isLoggedIn.value = false
    clearSessionState()
  } catch (e) {
    deleteError.value = e.message
  } finally {
    deleteBusy.value = false
  }
}
function cancelDelete() {
  deleteLink.value = null
  router.replace({ path: route.path })
}
const userData       = ref(null)
const isLoggedIn     = ref(false)
const sessionLoading = ref(true)
const logoutLoading  = ref(false)
const logoutError    = ref('')

let sessionChecked = false
onMounted(async () => {
  if (sessionChecked) return
  sessionChecked = true

  if (!getWasLoggedIn()) {
    sessionLoading.value = false
    return
  }

  try {
    const res = await fetchWithToken('/wp-json/qwoo/v1/me')
    if (res.ok) {
      const data = await res.json()
      userData.value  = data.user
      setUser(data.user)
      setLoggedIn(true)
      isLoggedIn.value = true
    } else {
      clearSessionState()
    }
  } catch (err) {
    console.error('Session check failed:', err)
    clearSessionState()
  } finally {
    sessionLoading.value = false
  }
})

function onLogin(user) {
  userData.value  = user
  setUser(user)
  setLoggedIn(true)
  isLoggedIn.value = true
}

async function logout() {
  logoutError.value   = ''
  logoutLoading.value = true

  try {
    await fetchWithToken('/wp-json/qwoo/v1/logout', { method: 'POST' })
  } catch (err) {
    console.error('Logout request failed:', err)
    logoutError.value = t('Logout failed. Please try again.')
    return
  } finally {
    logoutLoading.value = false
  }

  userData.value   = null
  isLoggedIn.value = false
  clearSessionState()
}
</script>
<style>
.q-tab-panels.q-panel-parent {
  overflow: hidden;
}
.account-tabs.q-tabs.q-tabs--scrollable.q-tabs--horizontal {
  overflow: hidden
}
.account-tabs.q-tabs.q-tabs__arrows--outside.q-tabs--horizontal.q-tabs--scrollable {
  padding-right: 26px;
  padding-left: 26px;
}
.account-tabs .q-tabs__content.scroll--mobile.row.no-wrap.items-center.self-stretch {
  overflow: auto;
}
.account-tabs i.q-icon.q-tabs__arrow.q-tabs__arrow--left {
  transform: translateX(-10px);
}
.account-tabs i.q-icon.q-tabs__arrow.q-tabs__arrow--right {
  transform: translateX(10px);
}
.delete-confirm { border: 1px solid rgba(0, 0, 0, .15); border-radius: 12px; max-width: 640px; }
</style>