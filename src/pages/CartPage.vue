<template>
  <!-- Built from the cart template (Store builder → Shop pages → Cart): the blocks read
       the cart from this page (provide 'cartPage'). -->
  <div class="cart-page">
    <SectionRenderer :sections="sections" page="cart" />
  </div>
</template>

<script setup>
import cart from 'src/stores/cart';
import { computed, onMounted, provide, reactive, ref } from 'vue';
import { useCartSummary } from 'src/composables/useCartSummary'
import { usePreviewCart } from 'src/utils/sample-cart.js'
import {useSeoMeta} from "src/composables/useSeo.js";
import SectionRenderer from 'components/sections/SectionRenderer.vue'
import { loadPageConfig } from 'src/utils/config-loader.js'
import { getApiOrigin } from 'src/utils/server/get-api-origin.js'
import { usePageConfig } from 'src/composables/usePageConfig.js'
import { shopSections } from 'src/utils/shop-templates.js'
import { t as i18nT } from 'src/i18n/index.js'

// The Store builder's preview of an empty cart shows a sample one.
const preview = usePreviewCart(cart)
const shown = () => preview.cart.value
const {
  displayCart, cartTotal, cartItems, cartTotalDiscount, couponApplied, shippingOptions,
  selectedShippingRateId, couponCode, couponError,
  fetchShippingRates, onShippingMethodChange, applyCoupon, removeCoupon, loadingCoupon
} = useCartSummary(shown)

defineOptions({
  async preFetch ({ ssrContext }) {
    let cartData;
    if(ssrContext) {
      cartData = await cart.fetchCart(true, ssrContext)
    } else if(cart.needsSync()) {
      cartData = await cart.syncLocalCartWithServer()
    }

    const configData = await loadPageConfig('cart', false, getApiOrigin(ssrContext)).catch(() => null)
    const seo = {
      title: i18nT('Cart'),
      description: 'Cart page',
      robots: 'noindex, follow'
    }

    if (ssrContext) {

      ssrContext.cartArray = cartData
      ssrContext.seoData = seo
      ssrContext.pageConfig = configData
    } else {
      window.__CART_ARRAY__ = cartData
      window.__SEO_DATA__ = seo
      window.__PAGE_CONFIG__ = configData

    }

  }
})
useSeoMeta({ noindex: true })
// Store builder → Shop pages → Cart.
const cartConfig = usePageConfig('cart')
const sections = computed(() => shopSections('cart', cartConfig.value))
const increase = (id) => shown().increase(id)
const decrease = (id) => shown().decrease(id)
const remove = (itemKey=null, itemAPIkey=null) => shown().remove(itemKey,itemAPIkey)

const getSlugFromPermalink = (permalink) => {
  if (!permalink) return ''
  const cleanUrl = permalink.split('?')[0]
  const match = cleanUrl.match(/product\/([^/]+)\/?$/)
  return match ? match[1] : ''
}

const getVariationQuery = (item) => {
  if (!item.variation?.length) return {}
  return Object.fromEntries(item.variation.map(v => [v.attribute, v.value]))
}

const isHydrated = ref(false)
onMounted(() => {
  isHydrated.value = true
  fetchShippingRates()
})

// What the template's blocks show and do (src/components/blocks/shop/Cart*Block.vue).
provide('cartPage', reactive({
  cart: preview.cart, displayCart, cartTotal, cartItems, cartTotalDiscount, couponApplied, shippingOptions,
  selectedShippingRateId, couponCode, couponError, onShippingMethodChange, applyCoupon, removeCoupon, loadingCoupon,
  increase, decrease, remove, getSlugFromPermalink, getVariationQuery, isHydrated,
}))
</script>

<style>
.empty-cart-msg {
  padding: 20px 0;
  font-size: 20px;
}
.empty-cart-msg a {
  text-decoration: underline;
  font-weight: 600;
}
.cart-items-wrap>.row{
    justify-content: space-between;
}
.cart-items-wrap>.row:not(:last-child) {
    border-bottom: 1px solid;
}
.cart-items-wrap .flex {
  column-gap: 5px;
}
.blockUi{
  position: absolute;
  height: 100%;
  width: 100%;
  background: #00000050;
  z-index: 999;
  left: 0;
  top: 0;
}
.blockUi:before {
  content: '';
  width: 30px;
  height: 30px;
  border: 5px solid #000;
  background: transparent;
  border-radius: 50%;
  display: block;
  border-top-color: #00000025;
  position: sticky;
  top: 100px;
  margin: 100px auto 0;
  animation: rotate 1s linear infinite;
}
@keyframes rotate {
  from{
    transform: rotate(0);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
