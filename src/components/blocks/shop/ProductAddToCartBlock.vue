<template>
  <div v-if="p?.product" class="product-buy" :class="[{ 'is-full': d.full_width || d.buttons_layout === 'stack' }, `product-buy--${d.buttons_layout || 'auto'}`]" :style="[radiusVar, paddingVars.vars]">
    <!-- Variations Selection for Variable Product -->
    <div v-if="p.isVariable" class="q-mb-md">
      <div v-for="attribute in p.availableAttributes" :key="attribute.id" class="q-mb-sm">
        <label class="text-subtitle2 q-mb-xs">{{ attribute.name }}</label>
        <!-- Product Options As "Buttons" / "Cards": one per value, the chosen one marked. -->
        <div
            v-if="choiceStyle !== 'select'"
            class="pb-choices"
            :class="`pb-choices--${choiceStyle}`"
            role="radiogroup"
            :aria-label="attribute.name"
            :style="choiceVars"
        >
          <button
              v-for="opt in p.getOptionsWithDisabled(attribute)"
              :key="opt.value"
              type="button"
              role="radio"
              class="pb-choice"
              :class="{ 'is-on': p.selectedVariations[attribute.name] === opt.value }"
              :aria-checked="p.selectedVariations[attribute.name] === opt.value ? 'true' : 'false'"
              :disabled="opt.disable"
              @click="choose(attribute.name, opt.value)"
          >
            <span v-if="choiceStyle === 'cards'" class="pb-choice__dot" aria-hidden="true" />
            <span class="pb-choice__label">{{ opt.label }}</span>
            <!-- eslint-disable-next-line vue/no-v-html -- built from the store's numbers, escaped -->
            <span v-if="!opt.disable && choicePriceOf(attribute.name, opt.value)" class="pb-choice__price" v-html="choicePriceOf(attribute.name, opt.value)" />
          </button>
        </div>
        <q-select
            v-else
            v-model="p.selectedVariations[attribute.name]"
            :options="p.getOptionsWithDisabled(attribute)"
            dense
            :dropdown-icon="matArrowDropDown"
            :clear-icon="matCancel"
            clearable
            :placeholder="t('Select a {name}', { name: attribute.name })"
            :label="t('Select a {name}', { name: attribute.name })"
            emit-value
            map-options
            @update:model-value="p.onVariationChange"
        />
      </div>
      <div v-if="p.variationError" class="text-negative text-caption q-mt-xs">{{ p.variationError }}</div>
    </div>

    <div v-if="p.product.status === 'draft'"><b>{{ t('This is a draft product. It\'s shown for admins only!') }}</b></div>

    <template v-else-if="p.product.is_in_stock">
      <div v-if="d.show_quantity !== false" class="row items-center q-mb-md">
        <q-btn :aria-label="t('Decrease quantity')" flat round :icon="matRemove" @click="p.decreaseQty" />
        <q-input
            v-model.number="p.quantity"
            type="number"
            :min="p.product?.add_to_cart?.minimum"
            :max="p.product?.add_to_cart?.maximum"
            dense
            style="width: 60px; text-align: center"
            :aria-label="t('Quantity for {name}', { name: p.product.name })"
        />
        <q-btn :aria-label="t('Increase quantity')" flat round :icon="matAdd" @click="p.increaseQty(p.product.add_to_cart?.maximum)" />
      </div>

      <div class="product-buy__buttons">
        <q-btn
            :label="d.button_label || t('Add to Cart')"
            class="buy-btn"
            :class="[buttonText.class, paddingVars.cls]"
            :style="[buttonText.style, buttonColors]"
            :color="buttonBg ? undefined : 'secondary'"
            :outline="d.button_style === 'outline'"
            :unelevated="d.button_style !== 'outline'"
            :disable="p.shouldDisableCartButtons"
            :loading="p.cart.state.loading.cart"
            @click="p.addToCartHandler"
        >
          <q-tooltip v-if="p.shouldDisableCartButtons">{{ t('Please select a variation first.') }}</q-tooltip>
        </q-btn>

        <q-btn
            v-if="d.show_quick_checkout !== false"
            :label="d.quick_label || t('Quick Checkout')"
            data-quick-checkout
            class="buy-btn quick-checkout-btn"
            :class="[buttonText.class, paddingVars.cls]"
            :style="[buttonText.style, quickColors]"
            :color="quickBg ? undefined : 'black'"
            to="/checkout"
            :disable="p.shouldDisableCartButtons"
            :loading="p.cart.state.loading.quickbuy"
            @click="p.addToCartHandler"
        >
          <q-tooltip v-if="p.shouldDisableCartButtons">{{ t('Please select a variation first.') }}</q-tooltip>
        </q-btn>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { matAdd, matArrowDropDown, matCancel, matRemove } from '@quasar/extras/material-icons'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { asResponsive, toCssLength } from 'src/composables/useSectionStyle.js'
import { gradientOf } from 'src/utils/gradient.js'

/**
 * "Add To Cart" (product page template): the variant choices, the quantity,
 * "Add to Cart" and "Quick Checkout". Nothing to buy while out of stock (the
 * Stock Note block says so).
 */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const p = inject('productPage', null)
const d = computed(() => props.data.data || {})
const buttonText = computed(() => textStyle(d.value, tsKeys('button'), 'buttons'))
const buttonBg = computed(() => resolveGlobalColor(d.value.button_bg))
const quickBg = computed(() => resolveGlobalColor(d.value.quick_bg))
const angle = computed(() => d.value.gradient_angle ?? 90)
// Outline: the button colour draws the border and text; filled: a second colour makes a gradient.
const buttonColors = computed(() => {
  if (d.value.button_style === 'outline') {
    return { ...(buttonBg.value ? { color: `${buttonBg.value} !important` } : {}), background: 'transparent' }
  }
  const bg = gradientOf(d.value.button_bg, d.value.button_bg2, angle.value)
  return { ...(bg ? { background: bg } : {}), ...(d.value.button_text ? { color: resolveGlobalColor(d.value.button_text) } : {}) }
})
const quickColors = computed(() => {
  const bg = gradientOf(d.value.quick_bg, d.value.quick_bg2, angle.value)
  return { ...(bg ? { background: bg } : {}), ...(d.value.quick_text ? { color: resolveGlobalColor(d.value.quick_text) } : {}) }
})
const radiusVar = computed(() => {
  const r = toCssLength(d.value.button_radius)
  return r ? { '--pb-btn-radius': r } : {}
})
// Style → Button Padding (both buttons), per side and screen size, like the Button block's.
const paddingVars = computed(() => {
  const vars = {}
  const cls = {}
  const r = asResponsive(d.value.btn_padding)
  const last = {}
  for (const [device, suffix, short] of [['desktop', '', 'd'], ['tablet', '-t', 't'], ['mobile', '-m', 'm']]) {
    const box = r[device] && typeof r[device] === 'object' ? r[device] : {}
    for (const side of ['top', 'right', 'bottom', 'left']) {
      // A side left empty on a smaller screen keeps the bigger screen's.
      let v = toCssLength(box[side])
      if (v === null || v === undefined || v === '') v = last[side]
      if (v === null || v === undefined || v === '') continue
      last[side] = v
      vars[`--pbp-${side}${suffix}`] = v
      cls[`pbp-${side[0]}-${short}`] = true
    }
  }
  return { vars, cls }
})

const choiceStyle = computed(() => (['buttons', 'cards'].includes(d.value.choice_style) ? d.value.choice_style : 'select'))
const choiceVars = computed(() => {
  const v = {}
  const c = resolveGlobalColor(d.value.choice_color)
  if (c) v['--pb-on'] = c
  const r = toCssLength(d.value.choice_radius)
  if (r) v['--pb-radius'] = r
  return v
})
// A price on each choice when the options cost different amounts (from the
// store's variation prices). Otherwise only the chosen card shows the price;
// older stores send no variation prices, so it waits for the chosen variation.
function choicePriceOf(name, value) {
  const chosen = p.selectedVariations[name] === value
  if (p.choicePricesDiffer) return p.choicePrice(name, value)
  if (choiceStyle.value !== 'cards' || !chosen) return ''
  return p.choicePrice(name, value) || (p.selectedVariation && !p.variationLoading ? p.safeVariationPrice : '')
}
function choose(name, value) {
  p.selectedVariations[name] = p.selectedVariations[name] === value ? null : value
  p.onVariationChange()
}
</script>

<style scoped>
.product-buy__buttons { display: flex; flex-wrap: wrap; gap: 8px; }
.is-full .product-buy__buttons { flex-direction: column; }
.is-full .buy-btn { width: 100%; }
.product-buy--equal .product-buy__buttons .buy-btn { flex: 1 1 0; }
.buy-btn { border-radius: var(--pb-btn-radius, 4px); min-height: 48px; padding-inline: 24px; }
/* Button Padding, per side and screen size (beats the built-in padding and min-height). */
@media (min-width: 1024px) {
  .pbp-t-d { padding-top: var(--pbp-top) !important; min-height: 0; }
  .pbp-r-d { padding-right: var(--pbp-right) !important; }
  .pbp-b-d { padding-bottom: var(--pbp-bottom) !important; min-height: 0; }
  .pbp-l-d { padding-left: var(--pbp-left) !important; }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .pbp-t-t { padding-top: var(--pbp-top-t, var(--pbp-top)) !important; min-height: 0; }
  .pbp-r-t { padding-right: var(--pbp-right-t, var(--pbp-right)) !important; }
  .pbp-b-t { padding-bottom: var(--pbp-bottom-t, var(--pbp-bottom)) !important; min-height: 0; }
  .pbp-l-t { padding-left: var(--pbp-left-t, var(--pbp-left)) !important; }
}
@media (max-width: 767px) {
  .pbp-t-m { padding-top: var(--pbp-top-m, var(--pbp-top-t, var(--pbp-top))) !important; min-height: 0; }
  .pbp-r-m { padding-right: var(--pbp-right-m, var(--pbp-right-t, var(--pbp-right))) !important; }
  .pbp-b-m { padding-bottom: var(--pbp-bottom-m, var(--pbp-bottom-t, var(--pbp-bottom))) !important; min-height: 0; }
  .pbp-l-m { padding-left: var(--pbp-left-m, var(--pbp-left-t, var(--pbp-left))) !important; }
}
.pb-choices { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.pb-choices--cards { flex-direction: column; gap: 10px; }
.pb-choice { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 8px 18px; border: 1.5px solid rgba(0, 0, 0, .16); border-radius: var(--pb-radius, 12px); background: transparent; color: inherit; font: inherit; font-weight: 600; cursor: pointer; text-align: start; }
.pb-choices--cards .pb-choice { width: 100%; padding: 14px 16px; }
.pb-choice:hover:not(:disabled) { border-color: var(--pb-on, var(--q-secondary)); }
.pb-choice.is-on { border-color: var(--pb-on, var(--q-secondary)); box-shadow: inset 0 0 0 1px var(--pb-on, var(--q-secondary)); }
.pb-choice:disabled { opacity: .45; cursor: not-allowed; text-decoration: line-through; }
.pb-choice__dot { width: 18px; height: 18px; flex: none; border-radius: 50%; border: 2px solid rgba(0, 0, 0, .3); }
.pb-choice.is-on .pb-choice__dot { border-color: var(--pb-on, var(--q-secondary)); background: radial-gradient(circle, var(--pb-on, var(--q-secondary)) 0 45%, transparent 50%); }
.pb-choice__price { margin-inline-start: auto; font-weight: 700; }
.pb-choices--buttons .pb-choice { flex-direction: column; align-items: flex-start; justify-content: center; gap: 0; }
.pb-choices--buttons .pb-choice__price { margin-inline-start: 0; font-size: .85em; font-weight: 400; opacity: .8; }
.pb-choice__price :deep(del) { opacity: .55; font-weight: 400; margin-inline-end: 6px; }
</style>
