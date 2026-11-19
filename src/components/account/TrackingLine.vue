<template>
  <div class="tracking-line">
    <span v-if="tracking.number"><strong>{{ t('Shipment number') }}<template v-if="tracking.courier"> ({{ tracking.courier }})</template>:</strong> <span dir="ltr">{{ tracking.number }}</span></span>
    <a v-if="safeUrl" class="tracking-line__btn" :href="safeUrl" target="_blank" rel="noopener noreferrer">{{ t('Track your shipment') }}</a>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'src/i18n/index.js'

/** An order's shipment: the courier, the number and its tracking page (Qwoo_Couriers on the store). */
const props = defineProps({ tracking: { type: Object, required: true } })
const { t } = useI18n()
// Only https addresses become links.
const safeUrl = computed(() => (/^https:\/\//i.test(props.tracking?.url || '') ? props.tracking.url : ''))
</script>

<style scoped>
.tracking-line { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; margin: 6px 0; }
.tracking-line__btn { display: inline-block; padding: 6px 14px; border-radius: 8px; background: var(--q-secondary); color: #fff; text-decoration: none; font-weight: 600; font-size: 14px; }
</style>
