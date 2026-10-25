<template>
  <div v-if="isIn && shown" class="account-welcome">
    <h2 class="account-welcome__title" :class="titleText.class" :style="titleText.style">{{ title }}</h2>
    <p class="account-welcome__text" :class="bodyText.class" :style="bodyText.style">{{ d.text || t('From here you can see your orders and change your details.') }}</p>
    <div v-if="d.show_links !== false" class="account-welcome__links">
      <router-link :to="partPath('orders')" class="account-welcome__link">{{ t('My Orders') }}</router-link>
      <router-link :to="partPath('details')" class="account-welcome__link">{{ t('Account Details') }}</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { useAccountView } from 'src/composables/useAccount.js'
import { partPath, usePartShown } from './account-parts.js'
import { useI18n } from 'src/i18n/index.js'

/** "Account Welcome" (My account): "Hello, {name}", a line of text and shortcuts. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const { t } = useI18n()
const d = computed(() => props.data.data || {})
const { user, signedIn: isIn } = useAccountView()
const shown = usePartShown(() => d.value, 'dashboard')
const name = computed(() => user.value?.first_name || '')
const title = computed(() => {
  const own = d.value.title
  if (own) return own.replace(/\{name\}/g, name.value).replace(/\s+([,!.])/g, '$1').replace(/,\s*$/, '')
  return name.value ? t('Hello, {name}', { name: name.value }) : t('Hello')
})
const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))
const bodyText = computed(() => textStyle(d.value, tsKeys('text')))
</script>

<style>
.account-welcome__title { margin: 0 0 8px; font-size: 1.5rem; line-height: 1.3; }
.account-welcome__text { margin: 0; }
.account-welcome__links { display: flex; flex-wrap: wrap; gap: 8px 20px; margin-top: 14px; }
.account-welcome__link { color: var(--q-secondary); text-decoration: underline; text-underline-offset: 3px; }
</style>
