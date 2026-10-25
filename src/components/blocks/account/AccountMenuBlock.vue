<template>
  <nav v-if="isIn" class="account-menu" :class="layoutClasses" :style="vars" :aria-label="t('My account')">
    <router-link
        v-for="item in items"
        :key="item.part"
        :to="partPath(item.part)"
        class="account-menu__link"
        :class="[{ 'is-current': current === item.part }, linkText.class]"
        :style="linkText.style"
        :aria-current="current === item.part ? 'page' : undefined"
    >{{ item.label }}</router-link>
    <button v-if="d.show_logout !== false" type="button" class="account-menu__link account-menu__logout" :class="linkText.class" :style="linkText.style" :disabled="busy" @click="logout">
      {{ d.logout_label || t('Sign out') }}
    </button>
  </nav>
</template>

<script setup>
import { computed, inject } from 'vue'
import { asResponsive, setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { useAccountView } from 'src/composables/useAccount.js'
import { ACCOUNT_PARTS, partPath, useAccountLogout } from './account-parts.js'
import { useI18n } from 'src/i18n/index.js'

/**
 * "Account Menu" (My account): links to the account's parts (their own
 * addresses, /my-account/orders…) and Sign out. Shown as a list down the
 * side or as tabs, per screen size.
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const { t } = useI18n()
const d = computed(() => props.data.data || {})
const { signedIn: isIn } = useAccountView()
const accountPage = inject('accountPage', null)
const current = computed(() => accountPage?.part || 'dashboard')
const { busy, logout } = useAccountLogout()

const LABELS = { dashboard: 'Dashboard', orders: 'My Orders', details: 'Account Details' }
const items = computed(() => ACCOUNT_PARTS
  .filter((part) => d.value[`show_${part}`] !== false)
  .map((part) => ({ part, label: d.value[`${part}_label`] || t(LABELS[part]) })))

const layoutClasses = computed(() => {
  const r = asResponsive(d.value.layout || { desktop: 'list', tablet: 'list', mobile: 'tabs' })
  return { 'am-d-tabs': r.desktop === 'tabs', 'am-t-tabs': r.tablet === 'tabs', 'am-m-tabs': r.mobile === 'tabs' }
})
const linkText = computed(() => textStyle(d.value, tsKeys('link')))
const vars = computed(() => {
  const v = {}
  setResponsiveVar(v, '--am-gap', d.value.gap, toCssLength)
  const pad = asResponsive(d.value.link_padding)
  for (const [device, suffix] of [['desktop', ''], ['tablet', '-t'], ['mobile', '-m']]) {
    const s = pad[device]
    if (s && typeof s === 'object' && ['top', 'right', 'bottom', 'left'].some((k) => toCssLength(s[k]))) {
      v[`--am-pad${suffix}`] = ['top', 'right', 'bottom', 'left'].map((k) => toCssLength(s[k]) || '0').join(' ')
    }
  }
  if (d.value.link_radius) v['--am-radius'] = toCssLength(d.value.link_radius)
  const color = (key, name) => { const c = resolveGlobalColor(d.value[key]); if (c) v[name] = c }
  color('active_color', '--am-active')
  color('active_bg', '--am-active-bg')
  color('hover_bg', '--am-hover-bg')
  return v
})
</script>

<style>
.account-menu {
  --am-pad-now: var(--am-pad, 10px 14px);
  display: flex;
  flex-direction: column;
  gap: var(--am-gap, 4px);
}
.account-menu__link {
  display: block;
  padding: var(--am-pad-now);
  border-radius: var(--am-radius, 8px);
  color: inherit;
  text-decoration: none;
  white-space: nowrap;
  background: none;
  border: 0;
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition: background-color .15s;
}
.account-menu__link:hover { background: var(--am-hover-bg, rgba(0, 0, 0, .05)); }
.account-menu__link.is-current { background: var(--am-active-bg, var(--q-secondary)); color: var(--am-active, var(--q-primary)); }
.account-menu__link:focus-visible { outline: 2px solid var(--q-secondary); outline-offset: 2px; }
/* Tabs: one scrolling row. */
.account-menu { scrollbar-width: none; }
.account-menu::-webkit-scrollbar { display: none; }
@media (min-width: 1024px) {
  .am-d-tabs { flex-direction: row; overflow-x: auto; }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .account-menu { --am-pad-now: var(--am-pad-t, var(--am-pad, 10px 14px)); gap: var(--am-gap-t, var(--am-gap, 4px)); }
  .am-t-tabs { flex-direction: row; overflow-x: auto; }
}
@media (max-width: 767px) {
  .account-menu { --am-pad-now: var(--am-pad-m, var(--am-pad-t, var(--am-pad, 10px 14px))); gap: var(--am-gap-m, var(--am-gap-t, var(--am-gap, 4px))); }
  .am-m-tabs { flex-direction: row; overflow-x: auto; }
}
</style>
