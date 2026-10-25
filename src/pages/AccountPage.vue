<!-- AccountPage.vue -->
<template>
  <div class="account-page">
    <div v-if="deleteLink || deleteDone" class="delete-confirm q-pa-md q-ma-md" role="region" :aria-label="t('Delete account')">
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

    <!-- Built from the My account template (Store builder → Shop pages → My account):
         sections for visitors (sign in, sign up) and for customers (the account's parts). -->
    <SectionRenderer v-if="!deleteDone" :sections="sections" page="account" />
    <div v-if="checking" class="account-page__checking"><q-spinner color="secondary" size="2em" /></div>
  </div>
</template>

<script setup>
import { computed, onMounted, provide, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchWithToken } from 'src/composables/useApiFetch.js'
import { clearSessionState } from 'src/composables/useSessionCleanup.js'
import { checkSession, useAccount } from 'src/composables/useAccount.js'
import { useSeoMeta } from 'src/composables/useSeo.js'
import { usePageConfig } from 'src/composables/usePageConfig.js'
import { loadPageConfig } from 'src/utils/config-loader.js'
import { getApiOrigin } from 'src/utils/server/get-api-origin.js'
import { shopSections } from 'src/utils/shop-templates.js'
import { partOf } from 'src/components/blocks/account/account-parts.js'
import SectionRenderer from 'components/sections/SectionRenderer.vue'
import { t as i18nT, useI18n } from 'src/i18n/index.js'

const { t } = useI18n()

defineOptions({
  async preFetch ({ ssrContext }) {
    const configData = await loadPageConfig('account', false, getApiOrigin(ssrContext)).catch(() => null)
    const seo = {
      title: i18nT('My account'),
      description: 'Account page',
      robots: 'noindex, follow',
    }
    if (ssrContext) {
      ssrContext.seoData = seo
      ssrContext.pageConfig = configData
    } else {
      window.__SEO_DATA__ = seo
      window.__PAGE_CONFIG__ = configData
    }
  },
})

useSeoMeta({ noindex: true })

const route = useRoute()
const router = useRouter()

// Store builder → Shop pages → My account.
const accountConfig = usePageConfig('account')
const sections = computed(() => shopSections('account', accountConfig.value))

// The account's part from the address (/my-account/orders…), for the Account Menu and the parts' blocks.
const page = reactive({ part: partOf(route.params.part) })
watch(() => route.params.part, (p) => { page.part = partOf(p) })
provide('accountPage', page)

// Until the browser knows who this is, nothing of either kind shows (CSS on html.qa-in / qa-out).
const { state } = useAccount()
const checking = ref(false)
onMounted(async () => {
  checking.value = !state.checked
  await checkSession()
  checking.value = false
})

// The link from the "Delete your account?" email: ?delete_account=token&u=user id.
const deleteLink  = ref(null) // { token, u } while confirming
const deleteBusy  = ref(false)
const deleteError = ref('')
const deleteDone  = ref(false)
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
</script>

<style>
.delete-confirm { border: 1px solid rgba(0, 0, 0, .15); border-radius: 12px; max-width: 640px; }
.account-page__checking { display: flex; justify-content: center; padding: 40px 0; }
</style>
