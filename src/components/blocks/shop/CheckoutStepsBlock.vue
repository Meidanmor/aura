<template>
  <!-- Steps as containers: the bar, then each step's own section (only the current one while the checkout is in steps). -->
  <div v-if="held.length" class="checkout-steps-block" :style="vars">
    <nav v-if="barShown" class="checkout-steps checkout-steps--held" :aria-label="t('Checkout steps')">
      <ol class="checkout-steps__list" :class="stepsText.class" :style="stepsText.style">
        <li
            v-for="(n, i) in c.stepList"
            :key="n"
            class="checkout-steps__item"
            :class="{ 'is-now': i === c.stepIndex, 'is-done': i < c.stepIndex }"
            :aria-current="i === c.stepIndex ? 'step' : undefined"
        >
          <button v-if="i < c.stepIndex || (c.inPreview && i !== c.stepIndex)" type="button" class="checkout-steps__btn" @click="c.goStep(i)">
            <span class="checkout-steps__num">{{ i + 1 }}</span><span>{{ label(n) }}</span>
          </button>
          <span v-else class="checkout-steps__btn">
            <span class="checkout-steps__num">{{ i + 1 }}</span><span>{{ label(n) }}</span>
          </span>
        </li>
      </ol>
    </nav>
    <div
        v-for="(s, i) in held"
        v-show="!c?.stepsOn || c.currentStep === i + 1"
        :key="s.id"
        class="checkout-steps__step"
    >
      <SectionTemplate :data="s" :page="page || 'checkout'" nested />
    </div>
  </div>
  <!-- A checkout published before the steps became containers: only the bar. -->
  <nav v-else-if="c?.ready && c.stepsOn && c.stepList.length > 1" class="checkout-steps" :style="vars" :aria-label="t('Checkout steps')">
    <ol class="checkout-steps__list" :class="stepsText.class" :style="stepsText.style">
      <li
          v-for="(n, i) in c.stepList"
          :key="n"
          class="checkout-steps__item"
          :class="{ 'is-now': i === c.stepIndex, 'is-done': i < c.stepIndex }"
          :aria-current="i === c.stepIndex ? 'step' : undefined"
      >
        <button v-if="i < c.stepIndex || (c.inPreview && i !== c.stepIndex)" type="button" class="checkout-steps__btn" @click="c.goStep(i)">
          <span class="checkout-steps__num">{{ i + 1 }}</span><span>{{ label(n) }}</span>
        </button>
        <span v-else class="checkout-steps__btn">
          <span class="checkout-steps__num">{{ i + 1 }}</span><span>{{ label(n) }}</span>
        </span>
      </li>
    </ol>
  </nav>
</template>

<script setup>
import { computed, inject } from 'vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'
import { t } from 'src/i18n/index.js'
// The steps are drawn like any inner section (it renders this block too: used only while
// rendering, so the two files importing each other is fine; the Tabs block does the same).
import SectionTemplate from 'components/sections/SectionTemplate.vue'

/**
 * "Checkout Steps": the block holds one inner section per step (its name is the step's
 * title), each with that step's blocks. While the checkout is in steps (Settings →
 * Checkout) it shows the steps bar and the current step; otherwise every step, one under
 * the other. Earlier steps can be opened again; in the Store builder preview, any step.
 * A checkout published before 2026-11-11 has no sections here: the block is only the bar
 * (Details · Delivery · Payment), and without one the checkout page draws it at the top.
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('checkoutPage', null)
const d = computed(() => props.data.data || {})
const held = computed(() => (Array.isArray(props.data.blocks) ? props.data.blocks : []).filter((s) => s && s.enabled !== false && s.type === 'section'))
const barShown = computed(() => d.value.show_bar !== false && c?.ready && c.stepsOn && c.stepList.length > 1)
const label = (n) => {
  if (held.value.length) return c.stepTitle(n)
  return n === 1 ? d.value.details_label || t('Details') : n === 2 ? d.value.delivery_label || t('Delivery') : d.value.payment_label || t('Payment')
}
const active = computed(() => resolveGlobalColor(d.value.active_color))
const vars = computed(() => {
  const v = active.value ? { '--co-step': active.value } : {}
  setResponsiveVar(v, '--co-bar-gap', d.value.bar_gap, toCssLength)
  return v
})
const stepsText = computed(() => textStyle(d.value, tsKeys('steps')))
</script>

<style scoped>
.checkout-steps--auto { padding: 16px 16px 0; }
.checkout-steps--held { margin-bottom: var(--co-bar-gap, 16px); }
@media (max-width: 1023.98px) { .checkout-steps--held { margin-bottom: var(--co-bar-gap-t, var(--co-bar-gap, 16px)); } }
@media (max-width: 599.98px) { .checkout-steps--held { margin-bottom: var(--co-bar-gap-m, var(--co-bar-gap-t, var(--co-bar-gap, 16px))); } }
.checkout-steps__list { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 4px; margin: 0; padding: 0; list-style: none; }
.checkout-steps__item { display: flex; align-items: center; gap: 4px; opacity: .55; }
.checkout-steps__item + .checkout-steps__item::before { content: ''; width: 24px; height: 1px; background: currentColor; opacity: .5; margin-inline-end: 4px; }
.checkout-steps__item.is-now, .checkout-steps__item.is-done { opacity: 1; }
.checkout-steps__btn { display: inline-flex; align-items: center; gap: 8px; padding: 4px 2px; border: 0; background: none; color: inherit; font: inherit; }
button.checkout-steps__btn { cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
.checkout-steps__num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 50%;
  border: 1px solid currentColor; font-size: .85em; line-height: 1;
}
.is-now .checkout-steps__num, .is-done .checkout-steps__num { background: var(--co-step, var(--q-secondary)); border-color: var(--co-step, var(--q-secondary)); color: #fff; }
.is-now .checkout-steps__btn { font-weight: 600; }
</style>
