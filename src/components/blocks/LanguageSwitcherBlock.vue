<script setup>
/**
 * Language Switcher (header widget): the store's other languages, as flags,
 * flags and names, or names, with the flags' size, the space between them and
 * the names' text style.
 */
import { computed } from 'vue'
import LanguageSwitcher from 'components/app/LanguageSwitcher.vue'
import { setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
  page: { type: String, default: '' },
})

const d = computed(() => props.data?.data || {})
const display = computed(() => (['flag', 'flag_name', 'name'].includes(d.value.display) ? d.value.display : 'flag'))
const nameText = computed(() => textStyle(d.value, tsKeys('name')))
const vars = computed(() => {
  const v = {}
  setResponsiveVar(v, '--ls-flag', d.value.flag_size, toCssLength)
  setResponsiveVar(v, '--ls-gap', d.value.gap, toCssLength)
  return v
})
</script>

<template>
  <LanguageSwitcher :display="display" :name-text="nameText" :style="vars" />
</template>
