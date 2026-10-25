<template>
  <component :is="tag" class="account-title" :class="titleText.class" :style="[{ textAlign: align }, titleText.style]">{{ d.title || t('My account') }}</component>
</template>

<script setup>
import { computed } from 'vue'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { useI18n } from 'src/i18n/index.js'

/** "Account Title" (My account template). */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const { t } = useI18n()
const d = computed(() => props.data.data || {})
const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))
const tag = computed(() => (d.value.tag === 'h2' ? 'h2' : 'h1'))
const align = computed(() => (['left', 'center', 'right'].includes(d.value.align) ? d.value.align : 'start'))
</script>

<style>
.account-title { margin: 0; font-size: 2rem; line-height: 1.2; }
</style>
