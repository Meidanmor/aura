<template>
  <div v-if="a" class="filters-btn-block">
    <ButtonBlock
        :data="btnData"
        :block-id="blockId"
        :action="toggle"
        :icon="icon"
        :icon-right="d.icon_position === 'end'"
        :aria-label="t('Filter products button')"
    />
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { matFilterList, matTune, matFilterAlt } from '@quasar/extras/material-icons'
import ButtonBlock from 'components/blocks/ButtonBlock.vue'
import { useI18n } from 'src/i18n/index.js'

/**
 * "Filters Button" (All products / category page template): opens the
 * Filters block's drawer. Phones only, where the filters are a drawer.
 * Looks like a Button block (same style fields), plus an icon.
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const a = inject('productArchive', null)
const { t } = useI18n()
const d = computed(() => props.data.data || {})

// Keys match FILTER_ICONS in class-sb-constants.php.
const ICONS = { filter_list: matFilterList, tune: matTune, filter_alt: matFilterAlt }
const icon = computed(() => (d.value.icon === 'none' ? '' : ICONS[d.value.icon] || matFilterList))
const btnData = computed(() => ({ data: { ...d.value, style: d.value.style || 'secondary', text: d.value.text || t('Filters') } }))
const toggle = () => { a.filtersOpen = !a.filtersOpen }
</script>

<style scoped>
.filters-btn-block { display: none; }
@media (max-width: 767px) { .filters-btn-block { display: block; } }
</style>
