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
import { formatStoreAmount } from 'src/utils/formatters.js'

const { t } = useI18n()


const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const product = ref(null)
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
    if(ssrProductSlug === route.params.slug) {
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

const imagesCarousel = useCarousel(
  async () => gallery.value,
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


// A variant stores the choice's slug ("light-blue") for shared attributes
// and the choice itself ("Light Blue") for options kept on the product.
// The shopper picks by name, so either one matches.
function sameChoice(attrName, value, selected) {
  if (value == null || selected == null) return false
  const v = String(value).toLowerCase()
  const s = String(selected).toLowerCase()
  if (v === s) return true
  const term = product.value?.attributes
    ?.find(a => a.name === attrName)
    ?.terms.find(t => String(t.name).toLowerCase() === s)
  return !!term && String(term.slug).toLowerCase() === v
}

function getOptionsWithDisabled(attribute) {
  // Get all original options for this attribute
  const allOptions = product.value.attributes
    .find(a => a.name === attribute.name)?.terms.map(t => t.name) || []

  return allOptions.map(opt => ({
    label: opt,
    value: opt,
    disable: !attribute.options.includes(opt)
  }))
}

const availableAttributes = computed(() => {
  if (!product.value?.attributes) return []

  // Only the attributes shoppers choose (options); the others (taste, material…) are product details.
  const attrMap = {}
  for (const attr of product.value.attributes.filter(a => a.has_variations !== false)) {
    if (!attrMap[attr.name]) {
      attrMap[attr.name] = {
        name: attr.name,
        id: attr.id,
        allOptions: attr.terms.map(t => t.name)
      }
    }
  }

  const attributeNames = Object.keys(attrMap)

  return attributeNames.map(attrName => {
    const allOptions = attrMap[attrName].allOptions

    const validOptions = allOptions.filter(optionValue => {
      // Build a hypothetical selection with this option chosen
      const hypothetical = { ...selectedVariations.value, [attrName]: optionValue }

      // Check if any variation is compatible with this hypothetical selection
      return product.value.variations.some(variation => {
        return attributeNames.every(name => {
          const selectedVal = hypothetical[name]

          // If this attribute isn't selected yet in hypothetical, skip it
          if (!selectedVal) return true

          const varAttr = variation.attributes.find(a => a.name === name)
          if (!varAttr) return false

          // Wildcard matches anything
          if (varAttr.value === null) return true

          return sameChoice(name, varAttr.value, selectedVal)
        })
      })
    })

    return {
      name: attrName,
      id: attrMap[attrName].id,
      options: validOptions
    }
  })
})


// Each variation's prices (extensions.qwoo.variation_prices: only in the store's
// single product answers, missing on older stores): id → { price, regular_price }.
const variationPrices = computed(() => {
  const map = new Map()
  for (const v of product.value?.extensions?.qwoo?.variation_prices || []) map.set(Number(v.id), v)
  return map
})

// The price shown on a choice: what the product costs with this option and the
// options already chosen. One price (with the old one when on sale), else
// "From" the lowest; '' when unknown or the same for every option.
function choicePrice(attrName, value) {
  if (!variationPrices.value.size || value == null) return ''
  const hypothetical = { ...selectedVariations.value, [attrName]: value }
  const found = []
  for (const variation of product.value.variations || []) {
    const fits = Object.entries(hypothetical).every(([name, selected]) => {
      if (!selected) return true
      const attr = variation.attributes.find(a => a.name === name)
      if (!attr) return false
      if (attr.value === null) return true
      return sameChoice(name, attr.value, selected)
    })
    const prices = fits && variationPrices.value.get(Number(variation.id))
    if (prices) found.push(prices)
  }
  if (!found.length) return ''
  const amounts = found.map(p => Number(p.price))
  const low = Math.min(...amounts)
  const pr = product.value.prices
  if (low !== Math.max(...amounts)) return t('From {price}', { price: formatStoreAmount(pr, low) })
  const regular = Number(found[0].regular_price)
  const now = formatStoreAmount(pr, low)
  return found.every(p => Number(p.regular_price) === regular) && regular > low
    ? `<del>${formatStoreAmount(pr, regular)}</del> ${now}`
    : now
}
// Whether the choices are worth a price each: some option costs something else.
const choicePricesDiffer = computed(() => new Set([...variationPrices.value.values()].map(p => `${p.price}/${p.regular_price}`)).size > 1)

// A product that came from a list (the shop page) has no variation prices:
// ask the store for the single product once, then keep them on the listed copy too.
const pricesAsked = new Set()
async function loadVariationPrices() {
  const current = product.value
  if (!current?.id || current.type !== 'variable' || pricesAsked.has(current.id)) return
  if (Array.isArray(current.extensions?.qwoo?.variation_prices)) return
  pricesAsked.add(current.id)
  try {
    const full = await fetchProductById(current.id)
    const list = full?.extensions?.qwoo?.variation_prices
    if (!Array.isArray(list)) return
    for (const p of [product.value, productsStore.products.value.find(x => x.id === current.id)]) {
      if (p?.id !== current.id) continue
      p.extensions = { ...(p.extensions || {}), qwoo: { ...(p.extensions?.qwoo || {}), variation_prices: list } }
    }
  } catch (e) {
    console.error(e)
  }
}

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
  handleAddToCart(e)
}
function handleAddToCart(e) {
  if (e?.target?.closest?.('[data-quick-checkout]')) {
    openDrawer.value = false;
  }
  const matchedVariation = product.value.variations.find((variation) => {
    return Object.entries(selectedVariations.value).every(([attrName, selectedValue]) => {
      const attr = variation.attributes.find(a => a.name === attrName);
      if (!attr || selectedValue === null) return false;
      if (attr.value === null) return true;
      return sameChoice(attrName, attr.value, selectedValue);
    });
  });

  if (!matchedVariation) {
    cart.add(product.value.id, quantity.value, null, null, $q, '', openDrawer.value);
    return;
  }

  const selectedVariationsArray = {variation: []};

  for (const attr of matchedVariation.attributes) {
    let resolvedValue = attr.value;

    if (resolvedValue === null || resolvedValue === 'null' || !resolvedValue) {
      resolvedValue = selectedVariations.value[attr.name] ?? '';
    }

    selectedVariationsArray.variation.push({
      attribute: attr.name,
      value: resolvedValue
    });
  }
  cart.add(product.value.id, quantity.value, matchedVariation.id, selectedVariationsArray.variation, $q, '', openDrawer.value);
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
  let existing = productsStore.products.value.find(p => {
    const pSlug = getSlugFromPermalink(p.permalink)
    return pSlug === slug
  })

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

  if (!product.value?.categories?.length) {
    product.value.categories = [product.value.extensions?.qwoo?.default_category]
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
const isVariable = computed(() => product.value?.type === 'variable')

const selectedVariations = ref({})
const selectedVariation = ref(null)
const variationError = ref('')
const wishlistAdded = ref(false);
function resetVariations() {
  selectedVariations.value = {}
  variationError.value = ''
  selectedVariation.value = null
}

const shouldDisableCartButtons = computed(() => {
  return isVariable.value && (!selectedVariation.value || selectedVariation.value === 'null')
})
async function fetchWishlistData() {

  await wishlist.fetchWishlistItems();

  if (wishlist.state.items && Object.values(wishlist.state.items).find(obj => selectedVariation.value ? selectedVariation.value.id : product.value.id === obj.id)) {
    wishlistAdded.value = true
  } else {
    wishlistAdded.value = false
  }

}

const variationLoading = ref(false)
async function onVariationChange() {
  variationLoading.value = true

  try {
    // Clear any selected values that are no longer valid
    for (const attr of availableAttributes.value) {
      const currentVal = selectedVariations.value[attr.name]

      if (currentVal && !attr.options.includes(currentVal)) {
        selectedVariations.value[attr.name] = null
      }
    }

    if (!product.value || !product.value.attributes) {
      selectedVariation.value = null
      return
    }

    const matched = product.value.variations.find((variation) => {
      return Object.entries(selectedVariations.value).every(([attrName, selectedValue]) => {
        const attr = variation.attributes.find(a => a.name === attrName)

        if (!attr || selectedValue === null) return false

        if (attr.value === null) return true

        return sameChoice(attrName, attr.value, selectedValue)
      })
    })

    if (matched) {
      const selectedCount = Object.keys(selectedVariations.value).length
      const variationCount = Object.keys(matched.attributes).length

      if (variationCount === selectedCount) {
        // Fetch full variation data before updating UI
        selectedVariation.value = await fetchProductById(matched.id)
      }

      variationError.value = ''
    } else {
      selectedVariation.value = null
      variationError.value = t('Please select valid variation options.')
    }

    // Ensure no empty selections remain
    for (const [, value] of Object.entries(selectedVariations.value)) {
      if (value == null) {
        selectedVariation.value = null
      }
    }

    // Update URL query params
    const url = new URL(window.location.href)
    url.search = ''

    for (const [key, value] of Object.entries(selectedVariations.value)) {
      if (value) {
        url.searchParams.set(key, value)
      }
    }

    window.history.replaceState({}, '', url.toString())

  } finally {
    variationLoading.value = false
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

onMounted(async() => {
  if (!product.value || !product.value.id) {
    await fetchProduct(route.params.slug)
    await enhanceProduct();
    await imagesCarousel.recompute(true)

  } else {
    enhanceProduct();
    imagesCarousel.recompute(true)

  }

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
  unsubscribeLiveConfig()
})

onBeforeRouteUpdate(async (to) => {
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
    imagesCarousel.slide.value = 0
    imagesCarousel.recompute(true)

    fetchSeoForPath(`product/${newSlug}`).then((seo) => { seoData.value = seo })
  }
)

const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)

const mouseDownTime = ref(0)

function onImageMouseDown() {
  mouseDownTime.value = Date.now()
}

function onImageMouseMove(e) {
  const dx = Math.abs(e.clientX - dragStartX.value)
  const dy = Math.abs(e.clientY - dragStartY.value)
  if (dx > 5 || dy > 5) isDragging.value = true
}

function onImageClick(index) {
  const elapsed = Date.now() - mouseDownTime.value
  if (elapsed > 200) return // was a drag, not a click
  openLightbox(index)
}


// What the template's blocks show and do (src/components/blocks/shop/Product*Block.vue).
// Objects holding refs of their own (the carousel, the stores) stay raw: a reactive
// wrapper would unwrap their refs.
provide('productPage', reactive({
  product, gallery, imagesCarousel: markRaw(imagesCarousel), cart: markRaw(cart), wishlist: markRaw(wishlist),
  reviewsOn, scrollToReviews, safeCategoryName, safePrice, safeVariationPrice, safeDescription,
  variationLoading, selectedVariation, selectedVariations, availableAttributes, getOptionsWithDisabled,
  choicePrice, choicePricesDiffer, loadExtras,
  onVariationChange, variationError, isVariable, quantity, decreaseQty, increaseQty,
  shouldDisableCartButtons, addToCartHandler, addToWishlist,
  onImageMouseDown, onImageMouseMove, onImageClick,
}))
</script>

<style scoped>
.product-page { padding-bottom: 8px; }
</style>
