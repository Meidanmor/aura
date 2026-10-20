<template>
  <div v-if="p?.product" class="product-buy" :class="{ 'is-full': d.full_width }">
    <!-- Variations Selection for Variable Product -->
    <div v-if="p.isVariable" class="q-mb-md">
      <div v-for="attribute in p.availableAttributes" :key="attribute.id" class="q-mb-sm">
        <label class="text-subtitle2 q-mb-xs">{{ attribute.name }}</label>
        <q-select
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
</script>

<style scoped>
.product-buy__buttons { display: flex; flex-wrap: wrap; gap: 8px; }
.is-full .product-buy__buttons { flex-direction: column; }
.is-full .buy-btn { width: 100%; }
</style>
