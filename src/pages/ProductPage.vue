<template>
  <!-- Built from the product page template (Store builder → Shop pages → Product page):
       the blocks read the product from this page (provide 'productPage'). -->
  <div v-if="product" class="product-page">
    <SectionRenderer :sections="productSections" page="product" />
  </div>

  <ErrorNotFound v-else-if="notFound" />
  <div v-else-if="product === null" class="q-pa-md flex items-center justify-center">
    <q-spinner color="secondary" size="6em" />
  </div>
  <LightboxGallery ref="lightboxRef" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, useSSRContext, watch, provide, reactive, markRaw } from 'vue'
import { sendPersonalizationEvent } from 'src/utils/personalization.js'
import { rememberViewed } from 'src/utils/recently-viewed.js'
import { ecommerceOf, eventItem, track } from 'src/utils/custom-code.js'
import { useRoute, useRouter, onBeforeRouteUpdate } from 'vue-router'
import { fetchProductById } from 'src/api/woocommerce.js'
import cart from 'src/stores/cart.js'
import wishlist from 'src/stores/wishlist.js'
import { productMatch } from 'src/utils/layouts.js'
import { shopSections } from 'src/utils/shop-templates.js'
import { useQuasar } from 'quasar'
import { fetchSeoForPath } from 'src/composables/useSeo'
import productsStore from 'src/stores/products'
import { matError } from '@quasar/extras/material-icons'
import { useSanitizedDescription, useSanitizedPrice, useSanitizedText } from 'src/composables/useSanitizedHtml'
import LightboxGallery from 'src/components/LightboxGallery.vue'
import {useCarousel} from '/src/composables/useCrousel.js'
import {useSeoMeta} from "src/composables/useSeo.js";
import {getApiOrigin} from "src/utils/server/get-api-origin.js";
import SectionRenderer from "components/sections/SectionRenderer.vue";
import ErrorNotFound from "pages/ErrorNotFound.vue";
import {loadPageConfig, subscribeToLiveConfig} from "src/utils/config-loader.js";
import { useI18n } from 'src/i18n/index.js'
import { sameSlug } from 'src/utils/slug.js'
import { useProductOptions } from 'src/composables/useProductOptions.js'

const { t } = useI18n()


const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const product = ref(null)
// Choosing options (variations): shared with the "choose options" sheet on product cards.
const {
  isVariable, selectedVariations, selectedVariation, variationError, variationLoading, resetVariations,
  shouldDisableCartButtons, availableAttributes, getOptionsWithDisabled,
  choicePrice, choicePricesDiffer, choiceSamePrice, loadVariationPrices, onVariationChange, chosenForCart,
} = useProductOptions(product, { syncAddress: true })
// No such product (or not published): the page shows the 404 page and answers 404.
const notFound = ref(false)
let unsubscribeLiveConfig = () => {}
const quantity = ref(1)
const productSettings = ref(
    process.env.CLIENT && window.__PAGE_CONFIG__
        ? window.__PAGE_CONFIG__
        : null
)
// The product's layout (Store builder): one made for this product or its category, else the default.
const productSections = computed(() => shopSections('product', productSettings.value, productMatch(product.value)))
const getSlugFromPermalink = (permalink) => {
  const match = permalink.match(/product\/([^/]+)\/?$/)
  return match ? match[1] : ''
}

if (process.env.SERVER) {
  const ssrContext = useSSRContext()

  if (ssrContext?.productData?.id) {
    product.value = ssrContext.productData
  } else {
    // Only when the store says there's no such product — not when it couldn't be reached.
    notFound.value = !!ssrContext?.seoData?.not_found
  }
  productSettings.value = ssrContext?.pageConfig || null

}
if (process.env.CLIENT) {
  notFound.value = !!window.__SEO_DATA__?.not_found && !window.__PRODUCT_DATA__?.id
  if (window.__PRODUCT_DATA__ && window.__PRODUCT_DATA__.id) {
    const ssrProductSlug = getSlugFromPermalink(window.__PRODUCT_DATA__.permalink)
    if (sameSlug(ssrProductSlug, route.params.slug)) {
      product.value = window.__PRODUCT_DATA__
    }
  }
  if (window.__PAGE_CONFIG__ && Object.keys(window.__PAGE_CONFIG__).length) {
    productSettings.value = window.__PAGE_CONFIG__
  }
}

// Photos and videos in the owner's order: the Store API's images, with the
// store's videos (extensions.qwoo.videos) put back in their places.
const gallery = computed(() => {
  const list = (product.value?.images || []).map((img) => ({ ...img, kind: 'image' }))
  for (const v of product.value?.extensions?.qwoo?.videos || []) {
    list.splice(Math.min(v.position, list.length), 0, { kind: 'video', id: v.id, src: v.src, type: v.type })
  }
  return list
})

// Not async: the slide count has to be there for the server render, or the server draws
// no dots and the browser does (a hydration mismatch).
const imagesCarousel = useCarousel(
  () => gallery.value,
    {
      chunkSizes: { xs: 1, sm: 1, md: 1 }
    }
)
imagesCarousel.recompute()

// 🟢 Run on SSR only
// Inside your Page or Layout
defineOptions({
  async preFetch ({ ssrContext, currentRoute, redirect }) {

    const isPreview = currentRoute.query.preview === 'true'

    let [seo, configData, productData] = await Promise.all([
      fetchSeoForPath(currentRoute.path, getApiOrigin(ssrContext)),
      loadPageConfig('product', isPreview, getApiOrigin(ssrContext)), // The helper we'll create
      productsStore.fetchSingleProduct(currentRoute.params.slug, ssrContext)
    ])
    // The owner changed the product's address: send visitors (and search engines) to the new one.
    if (seo.redirect && !productData?.id) {
      redirect(seo.redirect, 301)
      return
    }
    if (!productData?.id) productData = null
    // The store couldn't be reached (it didn't say "no such product"):
    // "try again later", so search engines keep the page.
    if (ssrContext?.res && !productData && !seo.not_found) ssrContext.res.statusCode = 503
    if (ssrContext) {

      // ✅ Normalize categories on SSR
      if (productData && !productData?.categories?.length) {
        productData.categories = [
          productData?.extensions?.qwoo?.default_category
        ].filter(Boolean)
      }
      // Initialize the state object if it doesn't exist
      ssrContext.seoData = seo
      ssrContext.productData = productData
      ssrContext.pageConfig = configData
    } else {
      window.__PRODUCT_DATA__ = productData
      window.__SEO_DATA__ = seo
      window.__PAGE_CONFIG__ = configData;

    }
  }
})


const { seoData } = useSeoMeta()


// The product's questions and its "bought together" ids (extensions.qwoo.faq /
// bought_together): only single product answers carry them, so the blocks that
// show them ask for the single product once when it came from a list.
const extrasAsked = new Set()
async function loadExtras() {
  const current = product.value
  const q = current?.extensions?.qwoo || {}
  if (!current?.id || extrasAsked.has(current.id) || (Array.isArray(q.faq) && Array.isArray(q.bought_together))) return
  extrasAsked.add(current.id)
  try {
    const full = await fetchProductById(current.id)
    const fq = full?.extensions?.qwoo || {}
    if (!Array.isArray(fq.faq) && !Array.isArray(fq.bought_together)) return
    for (const p of [product.value, productsStore.products.value.find(x => x.id === current.id)]) {
      if (p?.id !== current.id) continue
      p.extensions = { ...(p.extensions || {}), qwoo: { ...(p.extensions?.qwoo || {}), faq: fq.faq || [], bought_together: fq.bought_together || [] } }
    }
  } catch (e) {
    console.error(e)
  }
}

const lightboxRef = ref(null)

// replace your openLightbox function with:
function openLightbox(index) {
  // The lightbox shows photos only: count the photos before this one.
  const photoIndex = gallery.value.slice(0, index).filter((item) => item.kind === 'image').length
  lightboxRef.value.open(product.value?.images.length ? product.value?.images :  [{ src: '/naturaBloom-circle.svg' }], photoIndex)
}


const openDrawer = ref(true);
function addToCart(e) {
  return handleAddToCart(e)
}
// `checkout`: going to the checkout next, so the cart drawer stays closed.
function handleAddToCart(e, { checkout = false } = {}) {
  openDrawer.value = !checkout && !e?.target?.closest?.('[data-quick-checkout]')
  const chosen = chosenForCart()
  if (!chosen) {
    return cart.add(product.value.id, quantity.value, null, null, $q, '', openDrawer.value);
  }
  return cart.add(product.value.id, quantity.value, chosen.id, chosen.variation, $q, '', openDrawer.value);
}
// The Button block ("Use this page's product") and Floating Add To Cart: this
// product with the options chosen on the page. False while options are missing
// (the page then scrolls to them).
async function addCurrentToCart({ checkout = false } = {}) {
  if (isVariable.value && !selectedVariation.value) {
    variationError.value = t('Please select all variation options.')
    showChoices()
    return false
  }
  await handleAddToCart(null, { checkout })
  return true
}
function showChoices() {
  const el = [...document.querySelectorAll('.product-buy')].find((x) => x.offsetParent !== null)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
function increaseQty(maxQty) {
  if(quantity.value === maxQty){
    cart.notifyUser($q, 'negative', t('There are only {n} in stock', { n: 9 }), matError)
    return;
  }
  quantity.value++
}

function decreaseQty() {
  if (quantity.value > 1) quantity.value--
}

async function fetchProduct(slug) {
  let existing = productsStore.products.value.find(p => sameSlug(getSlugFromPermalink(p.permalink), slug))

  if (existing) {
    product.value = JSON.parse(JSON.stringify(existing))
  } else {
    product.value = await productsStore.fetchSingleProduct(slug)
  }

  if (!product.value?.id) {
    product.value = null
    const seo = await fetchSeoForPath(`product/${slug}`)
    if (seo.redirect) {
      router.replace(seo.redirect)
      return
    }
    notFound.value = !!seo.not_found
  } else {
    notFound.value = false
  }
}
async function enhanceProduct() {
  if (!product.value) return

  // Same as on the server: a product with no category (a gift card) gets an empty list, never [null].
  if (!product.value?.categories?.length) {
    product.value.categories = [product.value.extensions?.qwoo?.default_category].filter(Boolean)
  }

  quantity.value = 1

  await resetVariations()
  loadVariationPrices()

  // Auto-select from URL query params if present and valid
  const query = route.query
  if (Object.keys(query).length && product.value.attributes) {
    const validAttrNames = product.value.attributes.map(a => a.name)

    for (const [key, value] of Object.entries(query)) {
      if (!validAttrNames.includes(key)) continue

      // Check the value is a valid option for this attribute
      const attr = product.value.attributes.find(a => a.name === key)
      const validOptions = attr?.terms.map(t => t.name.toLowerCase()) || []

      if (validOptions.includes(String(value).toLowerCase())) {
        selectedVariations.value[key] = value
      }
    }

    // Trigger variation matching if we restored any selections
    if (Object.keys(selectedVariations.value).length) {
      await onVariationChange()
    }
  }

  await fetchWishlistData()
}
const wishlistAdded = ref(false);
async function fetchWishlistData() {

  await wishlist.fetchWishlistItems();

  if (wishlist.state.items && Object.values(wishlist.state.items).find(obj => selectedVariation.value ? selectedVariation.value.id : product.value.id === obj.id)) {
    wishlistAdded.value = true
  } else {
    wishlistAdded.value = false
  }

}

function addToCartHandler(e) {
  if (isVariable.value) {
    if (!selectedVariation.value) {
      variationError.value = t('Please select all variation options.')
      return
    }
    addToCart(e)
  } else {
    addToCart(e)
  }
}

async function addToWishlist() {
if(selectedVariation.value){
  await wishlist.toggleWishlistItem(selectedVariation.value.id, $q);
} else {
  await wishlist.toggleWishlistItem(product.value.id, $q);
}

  if (wishlist.state.items && Object.values(wishlist.state.items).find(obj => selectedVariation.value ? selectedVariation.value.id : product.value.id === obj.id)) {
    wishlistAdded.value = false;
  } else{
    wishlistAdded.value = true;
  }
}
const safeDescription = useSanitizedDescription(() => product.value?.description)

// Reviews: shown when the store turned them on (Store API extension data).
const reviewsOn = computed(() => product.value?.extensions?.qwoo?.reviews === true)
function scrollToReviews() {
  document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
const safePrice = useSanitizedPrice(() => product.value?.price_html)
const safeVariationPrice = useSanitizedPrice(() => selectedVariation.value?.price_html)
const safeCategoryName = useSanitizedText(() => product.value?.categories?.[0]?.name)

// The owner's trackers (Settings → Tracking & code).
function trackView() {
  const p = product.value
  if (p?.id) track('view_item', { ecommerce: ecommerceOf([eventItem(p, 1)], p.prices?.currency_code) })
  // "Recently viewed" product lists (kept in this browser).
  if (p?.id) rememberViewed(p.id)
}

let personalizationStartedAt = 0
function sendQualifiedView() {
  const p = product.value
  if (!p?.id || !personalizationStartedAt) return
  sendPersonalizationEvent('view', {
    product_id: Number(p.id),
    category_ids: (p.categories || []).map(c => Number(c?.id)).filter(Boolean),
    seconds: Math.floor((Date.now() - personalizationStartedAt) / 1000),
  })
  personalizationStartedAt = 0
}
function onPersonalizationVisibility() {
  if (document.visibilityState === 'hidden') sendQualifiedView()
  else if (product.value?.id && !personalizationStartedAt) personalizationStartedAt = Date.now()
}

onMounted(async() => {
  if (!product.value || !product.value.id) {
    await fetchProduct(route.params.slug)
    await enhanceProduct();
    await imagesCarousel.recompute(true)

  } else {
    enhanceProduct();
    imagesCarousel.recompute(true)

  }
  trackView()
  personalizationStartedAt = Date.now()
  document.addEventListener('visibilitychange', onPersonalizationVisibility)

  if (window.__PAGE_CONFIG__ && Object.keys(window.__PAGE_CONFIG__).length) {
    productSettings.value = window.__PAGE_CONFIG__
  } else {
    const isPreview = route.query.preview === 'true'
    // Use it directly
    const freshConfig = await loadPageConfig('product', isPreview)
    if (freshConfig) {
      productSettings.value = freshConfig
    }
  }
  unsubscribeLiveConfig = subscribeToLiveConfig('product', (data) => {
    productSettings.value = data
  })
})

onUnmounted(() => {
  sendQualifiedView()
  document.removeEventListener('visibilitychange', onPersonalizationVisibility)
  unsubscribeLiveConfig()
})

onBeforeRouteUpdate(async (to) => {
  sendQualifiedView()
  personalizationStartedAt = Date.now()
  try {
    await fetchProduct(to.params.slug)

  } catch (e) {
    console.error(e)
  }
})

watch(
  () => route.params.slug,
  async (newSlug, oldSlug) => {
    if (newSlug === oldSlug) return


    selectedVariation.value = null
    selectedVariations.value = {}
    variationError.value = ''
    quantity.value = 1

    //await fetchProduct(newSlug)

    enhanceProduct().catch(console.error)
    trackView()
    imagesCarousel.slide.value = 0
    imagesCarousel.recompute(true)

    fetchSeoForPath(`product/${newSlug}`).then((seo) => { seoData.value = seo })
  }
)


// What the template's blocks show and do (src/components/blocks/shop/Product*Block.vue).
// Objects holding refs of their own (the carousel, the stores) stay raw: a reactive
// wrapper would unwrap their refs.
provide('productPage', reactive({
  product, gallery, imagesCarousel: markRaw(imagesCarousel), cart: markRaw(cart), wishlist: markRaw(wishlist),
  reviewsOn, scrollToReviews, safeCategoryName, safePrice, safeVariationPrice, safeDescription,
  variationLoading, selectedVariation, selectedVariations, availableAttributes, getOptionsWithDisabled,
  choicePrice, choicePricesDiffer, choiceSamePrice, loadExtras,
  onVariationChange, variationError, isVariable, quantity, decreaseQty, increaseQty,
  shouldDisableCartButtons, addToCartHandler, addCurrentToCart, showChoices, addToWishlist,
  openLightbox,
}))
</script>

<style scoped>
.product-page { padding-bottom: 8px; }
</style>
