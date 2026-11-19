<template>
  <div class="pickup-point">
    <q-select
      :for="fid('point')"
      :model-value="selected"
      :options="shown"
      filled
      use-input
      fill-input
      hide-selected
      input-debounce="0"
      clearable
      :loading="loading"
      :disable="!city"
      :label="t('Pickup point *')"
      :hint="hint"
      :error="!!error"
      :error-message="error"
      behavior="menu"
      @filter="onFilter"
      @update:model-value="pick"
    >
      <template #option="scope">
        <q-item v-bind="scope.itemProps">
          <q-item-section>
            <q-item-label>{{ scope.opt.label }}</q-item-label>
            <q-item-label caption>{{ scope.opt.address }}</q-item-label>
            <q-item-label v-if="scope.opt.hours.length" caption class="pickup-point__hours">{{ scope.opt.hours.join(' · ') }}</q-item-label>
          </q-item-section>
        </q-item>
      </template>
      <template #no-option>
        <q-item><q-item-section class="text-grey">{{ points.length ? t('No point matches your search.') : t('No pickup points in this city.') }}</q-item-section></q-item>
      </template>
    </q-select>
    <p v-if="selected" class="pickup-point__chosen">
      <b>{{ selected.label }}</b><br>{{ selected.address }}<template v-if="selected.hours.length"><br><small>{{ selected.hours.join(' · ') }}</small></template>
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useFieldIds } from 'src/utils/field-id.js'
import { useI18n } from 'src/i18n/index.js'

/**
 * HFD pickup points at checkout ("Pickup point (HFD)" shipping method): the
 * points in the shopper's city, searchable by name or street. The store checks
 * the chosen point again when the order is placed (Qwoo_Couriers).
 * v-model: { id, name, address } or null.
 */
const props = defineProps({ city: { type: String, default: '' }, modelValue: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()
const fid = useFieldIds()

const points = ref([])
const loading = ref(false)
const error = ref('')
const needle = ref('')
let loadedFor = ''
let timer = null

const asOption = (p) => ({ value: p.id, label: p.name, address: p.address || '', hours: Array.isArray(p.hours) ? p.hours : [], search: `${p.name} ${p.address} ${p.street || ''}`.toLowerCase() })
const options = computed(() => points.value.map(asOption))
const shown = computed(() => {
  const q = needle.value.trim().toLowerCase()
  return q ? options.value.filter((o) => q.split(/\s+/).every((w) => o.search.includes(w))) : options.value
})
const selected = computed(() => options.value.find((o) => o.value === props.modelValue?.id) || null)
const hint = computed(() => {
  if (!props.city) return t('Enter your city first.')
  if (!points.value.length) return ''
  return t('{n} of {total} points in {city}', { n: shown.value.length, total: points.value.length, city: loadedFor })
})

function onFilter(val, update) {
  update(() => { needle.value = val || '' })
}
function pick(opt) {
  needle.value = ''
  emit('update:modelValue', opt ? { id: opt.value, name: opt.label, address: opt.address } : null)
}

async function load() {
  const city = (props.city || '').trim()
  if (city.length < 2 || city === loadedFor) return
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`/wp-json/qwoo/v1/pickup-points?city=${encodeURIComponent(city)}`, { credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'failed')
    points.value = Array.isArray(data.points) ? data.points : []
    loadedFor = city
    // A point from another city is no longer valid.
    if (props.modelValue && !points.value.some((p) => p.id === props.modelValue.id)) emit('update:modelValue', null)
  } catch {
    points.value = []
    error.value = t("We couldn't load the pickup points. Please try again.")
  } finally {
    loading.value = false
  }
}
watch(() => props.city, () => {
  clearTimeout(timer)
  timer = setTimeout(load, 600)
})
onMounted(load)
</script>

<style scoped>
.pickup-point { margin-top: 12px; }
.pickup-point__chosen { margin: 8px 0 0; line-height: 1.5; }
.pickup-point__hours { white-space: normal; }
</style>
