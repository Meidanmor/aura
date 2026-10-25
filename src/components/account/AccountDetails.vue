<template>
  <div>

    <!-- Loading state -->
    <div v-if="loading">
      <q-spinner color="secondary" size="2em" />
    </div>

    <!-- Error loading user -->
    <div v-else-if="loadError" class="text-negative">
      {{ loadError }}
    </div>

    <!-- Account form -->
    <div v-else>
      <q-form @submit.prevent="updateDetails">
        <q-input
          v-model="account.first_name"
          :label="t('First Name')"
          v-bind="look"
          class="q-mb-sm"
          :disable="saving"
        />
        <q-input
          v-model="account.last_name"
          :label="t('Last Name')"
          v-bind="look"
          class="q-mb-sm"
          :disable="saving"
        />
        <q-input
          v-model="account.email"
          :label="t('Email')"
          type="email"
          v-bind="look"
          class="q-mb-md"
          disable
          readonly
        />

        <q-btn
          type="submit"
          :label="t('Save Changes')"
          :color="buttonBg ? undefined : 'secondary'"
          :style="buttonStyle"
          no-caps
          unelevated
          :loading="saving"
        />

        <!-- Save feedback -->
        <div v-if="saveError" class="text-negative q-mt-md">{{ saveError }}</div>
        <div v-if="saveSuccess" class="text-positive q-mt-md">{{ t('Profile updated successfully.') }}</div>
      </q-form>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { fetchWithToken } from 'src/composables/useApiFetch.js'
import { setUser } from 'src/stores/user.js'
import { useI18n } from 'src/i18n/index.js'

const { t } = useI18n()
const props = defineProps({
  user: {
    type: Object,
    required: true
  },
  // The Account Details block's look.
  fieldLook: { type: String, default: 'filled' },
  buttonBg: { type: String, default: '' },
  buttonText: { type: String, default: '' },
})
const look = computed(() => (['filled', 'outlined', 'borderless'].includes(props.fieldLook) ? { [props.fieldLook]: true } : {}))
const buttonStyle = computed(() => ({
  ...(props.buttonBg ? { background: props.buttonBg } : {}),
  ...(props.buttonText ? { color: props.buttonText } : {}),
}))

const account = ref({
  first_name: props?.user?.first_name,
  last_name:  props?.user?.last_name,
  email:      props?.user?.email,
})

const saving     = ref(false)
const saveError  = ref('')
const saveSuccess = ref(false)


// ─── Save changes ─────────────────────────────────────────────────────────────

async function updateDetails() {
  if (props.user?.sample) return // the Store builder's preview
  saveError.value   = ''
  saveSuccess.value = false
  saving.value      = true
  try {
    const res  = await fetchWithToken('/wp-json/qwoo/v1/me', {
      method: 'POST',
      body: JSON.stringify({
        first_name: account.value.first_name,
        last_name:  account.value.last_name,
      }),
    })

    const data = await res.json()

    if (!data.success) {
      saveError.value = t(data.message || 'Failed to save changes. Please try again.')
      return
    }

    // Keep local state in sync with what the server confirmed
    account.value = {
      first_name: data.user.first_name,
      last_name:  data.user.last_name,
      email:      data.user.email,
    }

    // The welcome line and the header's Account widget show the new name too.
    setUser(data.user)
    saveSuccess.value = true

  } catch (err) {
    console.error('Failed to update account:', err)
    saveError.value = t('A server error occurred. Please try again later.')
  } finally {
    saving.value = false
  }
}
</script>