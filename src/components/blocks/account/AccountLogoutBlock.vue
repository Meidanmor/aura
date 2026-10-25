<template>
  <div v-if="isIn" class="account-logout">
    <q-btn
        :label="d.button_label || t('Sign out')"
        :outline="look === 'outline'"
        :flat="look === 'link'"
        :unelevated="look === 'filled'"
        :color="bg ? undefined : 'secondary'"
        :style="btnStyle"
        :class="{ 'account-logout--link': look === 'link' }"
        no-caps
        :loading="busy"
        @click="logout"
    />
    <div v-if="error" class="text-negative q-mt-sm" role="alert">{{ t(error) }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { useAccountView } from 'src/composables/useAccount.js'
import { useAccountLogout } from './account-parts.js'
import { useI18n } from 'src/i18n/index.js'

/** "Sign Out Button" (My account). */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const { t } = useI18n()
const d = computed(() => props.data.data || {})
const { signedIn: isIn } = useAccountView()
const { busy, error, logout } = useAccountLogout()
const look = computed(() => (['filled', 'outline', 'link'].includes(d.value.style) ? d.value.style : 'outline'))
const bg = computed(() => resolveGlobalColor(d.value.button_bg) || '')
const btnStyle = computed(() => {
  const text = resolveGlobalColor(d.value.button_text) || ''
  if (look.value === 'filled') return { ...(bg.value ? { background: bg.value } : {}), ...(text ? { color: text } : {}) }
  return text || bg.value ? { color: text || bg.value } : {}
})
</script>

<style>
.account-logout--link { text-decoration: underline; text-underline-offset: 3px; padding-inline: 0; }
</style>
