<template>
  <!-- "Cart Suggestions": a small row of products for the cart drawer (any page works too).
       Products bought together with what's in the cart, or the shopper's recently viewed ones. -->
  <div class="cart-sugg" :style="cssVars">
    <template v-if="shown?.length">
      <div v-if="title" class="cart-sugg__title" :class="titleText.class" :style="titleText.style">{{ title }}</div>
      <div ref="row" class="cart-sugg__row">
        <div v-for="p in shown" :key="p.id" class="cart-sugg__card">
          <router-link :to="pathOf(p)" class="cart-sugg__link">
            <img v-if="p.images?.[0]?.src" :src="p.images[0].thumbnail || p.images[0].src" :alt="p.images[0].alt || p.name" class="cart-sugg__img" loading="lazy" />
            <span v-else class="cart-sugg__img cart-sugg__img--none" />
            <span class="cart-sugg__info">
              <span class="cart-sugg__name" :class="nameText.class" :style="nameText.style" v-html="sanitizeSectionText(p.name)" />
              <span class="cart-sugg__price" :class="priceText.class" :style="priceText.style" v-html="priceOf(p)" />
            </span>
          </router-link>
          <q-btn
              round dense unelevated size="sm"
              class="cart-sugg__add"
              :style="buttonStyle"
              :icon="matAdd"
              :aria-label="t('Add {name} to the cart', { name: plain(p.name) })"
              :loading="adding === p.id"
              @click="add(p)"
          />
        </div>
      </div>
    </template>
    <EmptyProducts :d="d" :empty="empty" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { matAdd } from '@quasar/extras/material-icons'
import cart from 'src/stores/cart.js'
import productsStore from 'src/stores/products'
import { useBlockQuery } from 'src/composables/useBlockQuery.js'
import { useDragScroll } from 'src/composables/useDragScroll.js'
import { keyWithProduct, useExcludedProduct } from 'src/utils/current-product.js'
import { useCartSuggestions } from 'src/utils/cart-suggestions.js'
import { useRecentlyViewed } from 'src/utils/recently-viewed.js'
import { useSampleFallback } from 'src/utils/sample-items.js'
import { zeroPriceButton } from 'src/utils/zero-price.js'
import { formatCurrency } from 'src/utils/formatters.js'
import { sanitizeSectionText } from 'src/utils/sanitizeSectionText.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { toCssLength } from 'src/composables/useSectionStyle.js'
import EmptyProducts from '../../shop/EmptyProducts.vue'
import { t } from 'src/i18n/index.js'

const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const router = useRouter()
// Show: "cart" (bought together with the cart's products) or "recent" (recently viewed).
const d = computed(() => {
  const data = props.data.data || {}
  return { ...data, query_type: data.query_type === 'recent' ? 'recent' : 'cart', limit: data.limit || 6, hide_out_of_stock: data.hide_out_of_stock !== false }
})
const title = computed(() => (d.value.show_title === false ? '' : String(d.value.title || '').trim() || t('You may also like')))

const excludeId = useExcludedProduct(() => d.value)
const suggestions = useCartSuggestions(() => d.value)
const recent = useRecentlyViewed(() => d.value)
const queryKey = () => JSON.stringify([excludeId.value, d.value.query_type, d.value.cart_fallback, d.value.product_ids, d.value.limit, d.value.hide_out_of_stock, suggestions.value, recent.value])
const { data: products } = useBlockQuery(keyWithProduct(props.blockId, excludeId.value), queryKey, (ssrContext) =>
  productsStore.queryProducts({
    ...d.value,
    cart_ids: suggestions.value.ids,
    recent_ids: recent.value.ids,
    exclude_ids: [...(excludeId.value ? [excludeId.value] : []), ...suggestions.value.exclude],
  }, ssrContext),
)
// The Store builder preview with nothing to show: sample products.
const shown = useSampleFallback(() => products.value, 'product', 4)
const empty = computed(() => d.value.query_type === 'recent' && recent.value.ready && Array.isArray(shown.value) && !shown.value.length)

const row = ref(null)
useDragScroll(row)

const pathOf = (p) => {
  const slug = String(p.permalink || '').split('?')[0].split('/').filter(Boolean).pop()
  return slug ? `/product/${slug}` : '/products'
}
const plain = (html) => String(html || '').replace(/<[^>]*>/g, '')
const priceOf = (p) => (p.price_html ? sanitizeSectionText(p.price_html) : p.prices?.price ? formatCurrency(p.prices.price) : '')

// Simple products go in the cart; products with options (or no price) open their page.
const adding = ref(0)
async function add(p) {
  if (adding.value || p.sample) return
  const hasOptions = ['variable', 'grouped', 'external'].includes(p.type) || p.has_options === true
  if (hasOptions || zeroPriceButton(p)) return router.push(pathOf(p))
  adding.value = p.id
  try {
    await cart.add(p.id, 1, null, {}, null, p, false)
  } finally {
    adding.value = 0
  }
}

const titleText = computed(() => textStyle(d.value, tsKeys('title'), 'headings'))
const nameText = computed(() => textStyle(d.value, tsKeys('name')))
const priceText = computed(() => textStyle(d.value, tsKeys('price')))
const buttonStyle = computed(() => {
  const bg = resolveGlobalColor(d.value.button_bg) || 'var(--q-secondary)'
  const color = resolveGlobalColor(d.value.button_color) || '#fff'
  return { background: bg, color }
})
const cssVars = computed(() => {
  const vars = {}
  const w = toCssLength(d.value.card_width)
  if (w) vars['--cs-w'] = w
  const img = toCssLength(d.value.image_size)
  if (img) vars['--cs-img'] = img
  const bg = resolveGlobalColor(d.value.card_bg)
  if (bg) vars['--cs-bg'] = bg
  const r = toCssLength(d.value.card_radius)
  if (r) vars['--cs-r'] = r
  return vars
})
</script>

<style scoped>
.cart-sugg__title { font-weight: 600; margin-bottom: 8px; }
.cart-sugg__row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}
.cart-sugg__row::-webkit-scrollbar { display: none; }
.cart-sugg__card {
  flex: 0 0 var(--cs-w, 240px);
  max-width: 85%;
  scroll-snap-align: start;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--cs-bg, rgba(128, 128, 128, 0.08));
  border-radius: var(--cs-r, 8px);
}
.cart-sugg__link {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}
.cart-sugg__img {
  width: var(--cs-img, 56px);
  height: var(--cs-img, 56px);
  object-fit: cover;
  border-radius: 6px;
  flex: none;
}
.cart-sugg__img--none { background: rgba(128, 128, 128, 0.15); }
.cart-sugg__info { display: flex; flex-direction: column; min-width: 0; }
.cart-sugg__name {
  font-size: 13px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cart-sugg__price { font-size: 13px; opacity: .85; }
.cart-sugg__add { flex: none; }
</style>
