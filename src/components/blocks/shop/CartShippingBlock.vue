<template>
  <!-- "Cart Shipping" (cart page / cart drawer): Cart Totals' shipping choice on its own. -->
  <div v-if="c && !c.cart.state.offline && c.cart.hasItems.value && ready" class="relative-position cart-shipping">
    <div v-if="title" class="text-subtitle1 q-mb-xs">{{ title }}</div>
    <q-option-group
        v-if="c.shippingOptions.length"
        v-model="c.selectedShippingRateId"
        :options="c.shippingOptions"
        type="radio"
        color="secondary"
        @update:model-value="c.onShippingMethodChange"
    />
    <div v-else class="text-caption">{{ d.empty_text || t('Enter your address at checkout to see shipping options') }}</div>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { t } from 'src/i18n/index.js'

const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('cartPage', null)
const d = computed(() => props.data.data || {})
const ready = ref(false)
onMounted(() => { ready.value = true })
// Show a title: the owner's, else "Shipping".
const title = computed(() => (d.value.show_title === false ? '' : String(d.value.title || '').trim() || t('Shipping')))
</script>
