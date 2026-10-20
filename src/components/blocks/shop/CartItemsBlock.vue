<template>
  <!-- Only in the browser: the server doesn't know this shopper's cart (an "empty" message
       there would be kept, wrong, when the browser has items). -->
  <template v-if="c && c.isHydrated">
    <div v-if="c.cartItems.length === 0" class="empty-cart-msg">
      {{ d.empty_text || t('Your cart is empty.') }} <router-link to="/products/">{{ d.link_text || t('Go to shop') }}</router-link>
    </div>
    <div v-else-if="c.cart.hasItems.value && c.isHydrated" class="cart-items-wrap" :style="frame">
      <div v-for="item in c.cart.state.items" :key="item.id" class="q-pa-sm row items-center" :class="[item.key.includes('offline') ? 'offline-item' : '']">
        <div class="flex">
          <img v-if="item.images" :src="c.cart.state.offline === true ? item?.images[0]?.src : item.images[0]?.thumbnail" alt="" style="width: 70px; height: 70px; object-fit: cover" />
          <div class="product-meta">
            <div>
              <router-link :to="{ path: `/product/${c.getSlugFromPermalink(item?.permalink)}`, query: c.getVariationQuery(item) }" class="no-decoration">
                {{ item.name }}
              </router-link>
            </div>
            <div v-if="item.variation && item.variation.length > 0">
              <div v-for="(variation, index) in item.variation" :key="index">{{ variation.attribute }}: {{ variation.value }}</div>
            </div>
            <div v-if="item.prices">{{ formatCurrency(item.prices.price) }}</div>
          </div>
        </div>
        <div class="row items-center">
          <div class="qty-wrap">
            <q-btn size="xs" padding="xs" :flat="true" :icon="matRemove" :aria-label="t('Decrease quantity')" :disable="item.quantity === 1" @click="c.decrease(item.key)" />
            <span class="q-mx-sm">{{ item.quantity }}</span>
            <q-btn size="xs" padding="xs" :flat="true" :icon="matAdd" :aria-label="t('Increase quantity')" @click="c.increase(item.id)" />
          </div>
          <q-btn :outline="true" size="xs" padding="xs" :icon="matClose" :aria-label="t('Remove')" class="q-ml-sm" @click="c.remove(item.key, item.remote_key)" />
        </div>
      </div>
    </div>
  </template>
</template>

<script setup>
import { computed, inject } from 'vue'
import { matAdd, matClose, matRemove } from '@quasar/extras/material-icons'
import { formatCurrency } from 'src/utils/formatters.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'

/** "Cart Items" (cart page template): the products in the cart, or "Your cart is empty". */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const c = inject('cartPage', null)
const d = computed(() => props.data.data || {})
const frame = computed(() => (d.value.border_color ? { borderColor: resolveGlobalColor(d.value.border_color) } : null))
</script>
