<!-- src/components/shop/SortBar.vue -->
<template>
  <div class="flex justify-between q-mb-md sticky">
    <q-select
        filled
        :model-value="sortBy"
        @update:model-value="$emit('update:sortBy', $event)"
        :label="t('Sort by')"
        emit-value
        map-options
        :options="(sortOptions || []).map((o) => ({ ...o, label: t(o.label) }))"
        :dropdown-icon="matArrowDropDown"
        :loading-icon="matAutorenew"
        :clear-icon="matClose"
        color="secondary"
    />
    <q-btn
        class="mobile-only"
        :icon="matFilterList"
        :label="filterButtonLabel"
        :aria-label="t('Filter products button')"
        color="secondary"
        @click="$emit('toggle-filters')"
    />
  </div>
</template>

<script setup>
import { matArrowDropDown, matAutorenew, matClose, matFilterList } from '@quasar/extras/material-icons'
defineProps({ sortBy: String, sortOptions: Array, filterButtonLabel: { type: String, default: '' } })
defineEmits(['update:sortBy', 'toggle-filters'])
</script>