<template>
  <div v-if="p?.product" class="product-buy" :class="{ 'is-full': d.full_width }">
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
            <span
                v-if="choiceStyle === 'cards' && p.selectedVariations[attribute.name] === opt.value && p.selectedVariation && !p.variationLoading"
                class="pb-choice__price"
                v-html="p.safeVariationPrice"
            />
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
            :class="buttonText.class"
            :style="[buttonText.style, buttonColors]"
            :color="buttonBg ? undefined : 'secondary'"
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
            :class="buttonText.class"
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
import { toCssLength } from 'src/composables/useSectionStyle.js'

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
const buttonColors = computed(() => ({ ...(buttonBg.value ? { background: buttonBg.value } : {}), ...(d.value.button_text ? { color: resolveGlobalColor(d.value.button_text) } : {}) }))
const quickColors = computed(() => ({ ...(quickBg.value ? { background: quickBg.value } : {}), ...(d.value.quick_text ? { color: resolveGlobalColor(d.value.quick_text) } : {}) }))

const choiceStyle = computed(() => (['buttons', 'cards'].includes(d.value.choice_style) ? d.value.choice_style : 'select'))
const choiceVars = computed(() => {
  const v = {}
  const c = resolveGlobalColor(d.value.choice_color)
  if (c) v['--pb-on'] = c
  const r = toCssLength(d.value.choice_radius)
  if (r) v['--pb-radius'] = r
  return v
})
function choose(name, value) {
  p.selectedVariations[name] = p.selectedVariations[name] === value ? null : value
  p.onVariationChange()
}
</script>

<style scoped>
.product-buy__buttons { display: flex; flex-wrap: wrap; gap: 8px; }
.is-full .product-buy__buttons { flex-direction: column; }
.is-full .buy-btn { width: 100%; }
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
.pb-choice__price :deep(del) { opacity: .55; font-weight: 400; margin-inline-end: 6px; }
</style>
