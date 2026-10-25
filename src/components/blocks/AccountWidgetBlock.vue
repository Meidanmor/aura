<script setup>
/**
 * Account (header widget). Visitors: a link to the sign-in page (My account,
 * or the owner's own address). Signed-in customers: their initials or name
 * if the owner chose that, and a small menu of shortcuts (My account, My
 * Orders, Account Details, Sign out), or a link to My account.
 *
 * Who it is comes from the browser (useAccount.js), so the server's page
 * always shows the visitor's button; it changes after the session check.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import WidgetButton from './WidgetButton.vue'
import { accountIcons } from 'src/utils/builder-icons.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { toCssLength } from 'src/composables/useSectionStyle.js'
import { signOut, useAccount } from 'src/composables/useAccount.js'
import { partPath } from './account/account-parts.js'
import { useI18n } from 'src/i18n/index.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
  page: { type: String, default: '' },
})

const { t } = useI18n()
const router = useRouter()
const d = computed(() => props.data?.data || {})
const { user, signedIn: isIn } = useAccount()

// Only this store's own addresses (never another site).
const guestTo = computed(() => {
  const url = String(d.value.guest_url || '').trim()
  return /^\/(?!\/)/.test(url) ? url : '/my-account'
})
const look = computed(() => (isIn.value ? d.value.signed_in_look || 'icon' : 'icon'))
const initials = computed(() => {
  const u = user.value || {}
  const s = `${(u.first_name || '').trim().charAt(0)}${(u.last_name || '').trim().charAt(0)}` || (u.email || '').charAt(0)
  return s.toUpperCase() || '?'
})
// The button's text: a visitor's label, a customer's first name (or the same label).
const buttonData = computed(() => {
  if (!isIn.value) return d.value
  if (look.value === 'name' && user.value?.first_name) return { ...d.value, label: user.value.first_name }
  return { ...d.value, label: look.value === 'initials' ? '' : d.value.label }
})
const showMenu = computed(() => isIn.value && d.value.show_menu !== false)
const items = computed(() => [
  d.value.menu_account !== false && { key: 'account', to: partPath('dashboard'), label: t('My account') },
  d.value.menu_orders !== false && { key: 'orders', to: partPath('orders'), label: t('My Orders') },
  d.value.menu_details !== false && { key: 'details', to: partPath('details'), label: t('Account Details') },
].filter(Boolean))

const menuStyle = computed(() => ({
  ...(resolveGlobalColor(d.value.menu_bg) ? { background: resolveGlobalColor(d.value.menu_bg) } : {}),
  ...(resolveGlobalColor(d.value.menu_text) ? { color: resolveGlobalColor(d.value.menu_text) } : {}),
  ...(d.value.menu_radius ? { borderRadius: toCssLength(d.value.menu_radius) } : {}),
}))
const itemText = computed(() => textStyle(d.value, tsKeys('item')))
const initialsStyle = computed(() => ({
  background: resolveGlobalColor(d.value.initials_bg) || 'var(--q-secondary)',
  color: resolveGlobalColor(d.value.initials_color) || 'var(--q-primary)',
}))

async function logout() {
  try {
    await signOut()
    router.push('/my-account')
  } catch (e) {
    console.error('Sign out failed:', e)
  }
}
</script>

<template>
  <WidgetButton
      v-if="!isIn || !showMenu"
      :d="buttonData"
      :icons="accountIcons"
      :default-icon="accountIcons.person_outline"
      :aria-label="isIn ? t('My account') : t('Sign in')"
      :to="isIn ? partPath('dashboard') : guestTo"
      action="account"
  >
    <template v-if="look === 'initials'" #icon><span class="account-widget__initials" :style="initialsStyle">{{ initials }}</span></template>
  </WidgetButton>
  <WidgetButton
      v-else
      :d="buttonData"
      :icons="accountIcons"
      :default-icon="accountIcons.person_outline"
      :aria-label="t('My account')"
      action="account"
  >
    <template v-if="look === 'initials'" #icon><span class="account-widget__initials" :style="initialsStyle">{{ initials }}</span></template>
    <q-menu anchor="bottom end" self="top end" :offset="[0, 6]" class="account-widget__menu" :style="menuStyle">
      <div v-if="d.show_greeting !== false && user?.first_name" class="account-widget__hello">{{ t('Hello, {name}', { name: user.first_name }) }}</div>
      <q-list dense>
        <q-item v-for="item in items" :key="item.key" v-close-popup clickable :to="item.to" exact active-class="account-widget__current">
          <q-item-section><span :class="itemText.class" :style="itemText.style">{{ item.label }}</span></q-item-section>
        </q-item>
        <q-item v-if="d.menu_logout !== false" v-close-popup clickable @click="logout">
          <q-item-section><span :class="itemText.class" :style="itemText.style">{{ t('Sign out') }}</span></q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </WidgetButton>
</template>

<style>
.account-widget__initials {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2em;
  height: 2em;
  border-radius: 50%;
  font-size: .75em;
  font-weight: 700;
  letter-spacing: .02em;
}
.account-widget__menu { min-width: 190px; padding: 6px 0; }
.account-widget__current { font-weight: 700; }
.account-widget__hello { padding: 8px 16px 6px; font-weight: 600; }
</style>
