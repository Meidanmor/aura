<template>
  <div v-if="!hidden" class="countdown-block" :class="`countdown-block--${d.style || 'boxes'}`" :style="cssVars">
    <p v-if="expired && d.expired_action === 'message'" class="countdown-block__message" role="status">
      {{ d.expired_message || t('This offer has ended.') }}
    </p>
    <div
        v-else
        class="countdown-block__units"
        role="timer"
        :aria-label="ariaLabel"
    >
      <div v-for="unit in units" :key="unit.key" class="countdown-block__unit">
        <span class="countdown-block__number">{{ unit.value }}</span>
        <span v-if="d.show_labels !== false" class="countdown-block__label">{{ unit.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { setResponsiveVar, toCssLength, alignToFlex } from 'src/composables/useSectionStyle.js'
import { useI18n } from 'src/i18n/index.js'

const { t } = useI18n()

const props = defineProps({
  data: { type: Object, required: true },
  blockId: { type: String, default: '' },
})

const d = computed(() => props.data.data || {})
// end_at is ISO 8601 with the store's UTC offset (resolved by the plugin).
const endMs = computed(() => {
  const t = Date.parse(d.value.end_at || '')
  return Number.isFinite(t) ? t : null
})

// `now` stays null during SSR and the first client render, so both render
// the same placeholders ("--") and hydration never mismatches; the real
// numbers start on mount.
const now = ref(null)
let timer = null
onMounted(() => {
  now.value = Date.now()
  timer = setInterval(() => { now.value = Date.now() }, 1000)
})
onBeforeUnmount(() => clearInterval(timer))

const remaining = computed(() => (now.value === null || endMs.value === null ? null : Math.max(0, endMs.value - now.value)))
// Expiry known up front (SSR too) only for "hide", so an ended countdown
// doesn't flash before disappearing.
const expired = computed(() => {
  if (endMs.value === null) return false
  const t = now.value ?? Date.now()
  return t >= endMs.value
})
const hidden = computed(() => endMs.value === null || (expired.value && d.value.expired_action === 'hide'))

const pad = (n) => String(n).padStart(2, '0')
const units = computed(() => {
  const r = remaining.value
  const total = r === null ? null : Math.floor(r / 1000)
  const showDays = d.value.show_days !== false
  const days = total === null ? null : Math.floor(total / 86400)
  const hours = total === null ? null : Math.floor((showDays ? total % 86400 : total) / 3600)
  const minutes = total === null ? null : Math.floor((total % 3600) / 60)
  const seconds = total === null ? null : total % 60
  const fmt = (v) => (v === null ? '--' : pad(v))

  const list = []
  if (showDays) list.push({ key: 'd', value: fmt(days), label: d.value.label_days || t('Days') })
  list.push({ key: 'h', value: fmt(hours), label: d.value.label_hours || t('Hours') })
  list.push({ key: 'm', value: fmt(minutes), label: d.value.label_minutes || t('Minutes') })
  if (d.value.show_seconds !== false) list.push({ key: 's', value: fmt(seconds), label: d.value.label_seconds || t('Seconds') })
  return list
})

// Screen readers get a sentence (and not one announcement per second).
const ariaLabel = computed(() => units.value.map((u) => `${u.value} ${u.label}`).join(', '))

const cssVars = computed(() => {
  const vars = {}
  setResponsiveVar(vars, '--cd-size', d.value.number_size || '40px', toCssLength)
  setResponsiveVar(vars, '--cd-align', d.value.alignment || 'center', alignToFlex)
  const map = { number_color: '--cd-number', label_color: '--cd-label', box_bg: '--cd-box' }
  for (const [key, cssVar] of Object.entries(map)) {
    const c = resolveGlobalColor(d.value[key])
    if (c) vars[cssVar] = c
  }
  return vars
})
</script>

<style scoped>
.countdown-block__units {
  display: flex;
  flex-wrap: wrap;
  justify-content: var(--cd-align, center);
  gap: 12px;
}
.countdown-block__unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: calc(var(--cd-size, 40px) * 1.8);
}
.countdown-block--boxes .countdown-block__unit {
  padding: 12px 10px;
  border-radius: 10px;
  background: var(--cd-box, rgba(0, 0, 0, 0.06));
}
.countdown-block__number {
  font-size: var(--cd-size, 40px);
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--cd-number, inherit);
}
.countdown-block__label {
  margin-top: 4px;
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--cd-label, inherit);
  opacity: 0.8;
}
.countdown-block__message { margin: 0; text-align: center; font-weight: 600; }

@media (max-width: 1023px) {
  .countdown-block__units { justify-content: var(--cd-align-t, center); }
  .countdown-block__number { font-size: var(--cd-size-t, 36px); }
  .countdown-block__unit { min-width: calc(var(--cd-size-t, 36px) * 1.8); }
}
@media (max-width: 767px) {
  .countdown-block__units { justify-content: var(--cd-align-m, center); gap: 8px; }
  .countdown-block__number { font-size: var(--cd-size-m, 28px); }
  .countdown-block__unit { min-width: calc(var(--cd-size-m, 28px) * 1.8); }
}
</style>
