<template>
  <ul v-if="icons.length" class="pay-icons" :class="{ 'pay-icons--mono': mono }" :style="vars">
    <li v-for="icon in icons" :key="icon.key" class="pay-icons__item" :title="icon.label">
      <!-- eslint-disable-next-line vue/no-v-html -- fixed markup from payment-icons.js -->
      <svg viewBox="0 0 48 30" role="img" :aria-label="icon.label" v-html="icon.svg" />
    </li>
  </ul>
</template>

<script setup>
import { computed } from 'vue'
import { PAYMENT_ICONS } from 'src/utils/payment-icons.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { setResponsiveVar, toCssLength, alignToFlex } from 'src/composables/useSectionStyle.js'

/** "Payment Icons": the ways shoppers can pay, as small cards (in colour or one colour). */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' } })
const d = computed(() => props.data.data || {})
const mono = computed(() => d.value.look === 'mono')
const monoColor = computed(() => resolveGlobalColor(d.value.mono_color) || 'currentColor')
const icons = computed(() => (d.value.items || [])
  .map((i) => i?.icon)
  .filter((key, n, all) => PAYMENT_ICONS[key] && all.indexOf(key) === n)
  .map((key) => ({ key, label: PAYMENT_ICONS[key].label, svg: PAYMENT_ICONS[key].svg(mono.value ? monoColor.value : '') })))
const vars = computed(() => {
  const v = {}
  setResponsiveVar(v, '--pi-h', d.value.height, toCssLength)
  setResponsiveVar(v, '--pi-gap', d.value.gap, toCssLength)
  setResponsiveVar(v, '--pi-align', d.value.alignment, alignToFlex)
  return v
})
</script>

<style scoped>
.pay-icons { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; align-items: center; gap: var(--pi-gap, 8px); justify-content: var(--pi-align, flex-start); }
.pay-icons__item { display: flex; height: var(--pi-h, 26px); aspect-ratio: 48 / 30; background: #fff; border: 1px solid rgba(0, 0, 0, .1); border-radius: 4px; }
.pay-icons--mono .pay-icons__item { background: transparent; border-color: currentColor; opacity: .85; }
.pay-icons__item svg { width: 100%; height: 100%; }
@media (max-width: 1023px) {
  .pay-icons { gap: var(--pi-gap-t, var(--pi-gap, 8px)); justify-content: var(--pi-align-t, var(--pi-align, flex-start)); }
  .pay-icons__item { height: var(--pi-h-t, var(--pi-h, 26px)); }
}
@media (max-width: 767px) {
  .pay-icons { gap: var(--pi-gap-m, var(--pi-gap-t, var(--pi-gap, 8px))); justify-content: var(--pi-align-m, var(--pi-align-t, var(--pi-align, flex-start))); }
  .pay-icons__item { height: var(--pi-h-m, var(--pi-h-t, var(--pi-h, 26px))); }
}
</style>
