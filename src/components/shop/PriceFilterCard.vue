<!-- src/components/shop/PriceFilterCard.vue -->
<template>
  <div class="filters-inner-wrap q-pa-md q-mb-md" v-if="min == null || max == null">
    <q-skeleton type="rect" class="q-mb-md" />
  </div>
  <q-card class="filters-inner-wrap price-range-wrap q-pa-md q-mb-md" v-else>
    <div class="text-subtitle1 q-mb-sm">{{ t('Filter by Price') }}</div>
    <q-range
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :min="min"
        :max="max"
        label-always
        label
        dense
        color="secondary"
        :step="0.01"
        :aria-label="t('Price range filter')"
        @change="$emit('change')"
    />
  </q-card>
</template>

<script setup>
defineProps({ modelValue: Object, min: Number, max: Number })
defineEmits(['update:modelValue', 'change'])
</script>

<style scoped>
/* The price labels sit on the store's second colour: their text follows its readable colour. */
.price-range-wrap :deep(.q-slider__text-container),
.price-range-wrap :deep(.q-slider__text) { color: var(--q-on-secondary, #fff) !important; }
</style>
