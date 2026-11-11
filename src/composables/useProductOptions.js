import { computed, ref } from 'vue'
import { fetchProductById } from 'src/api/woocommerce.js'
import productsStore from 'src/stores/products'
import { formatStoreAmount } from 'src/utils/formatters.js'
import { t } from 'src/i18n/index.js'

/**
 * Choosing a product's options (its variations): which choices are still possible, the price
 * a choice leads to, the chosen variation, and what goes to the cart. One implementation for
 * the product page (`syncAddress`: the choices are kept in the address) and for the
 * "choose options" sheet opened from a product card (QuickOptions.vue).
 * `product`: a ref to the product (Store API shape).
 */
export function useProductOptions(product, { syncAddress = false } = {}) {
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

  // The prices of the variants that fit these picks (an "any" choice fits every pick).
  function fittingPrices(picks) {
    const found = []
    for (const variation of product.value?.variations || []) {
      const fits = Object.entries(picks).every(([name, selected]) => {
        if (!selected) return true
        const attr = variation.attributes.find(a => a.name === name)
        if (!attr) return false
        if (attr.value === null || attr.value === '') return true
        return sameChoice(name, attr.value, selected)
      })
      const prices = fits && variationPrices.value.get(Number(variation.id))
      if (prices) found.push(prices)
    }
    return found
  }
  // The options whose choices change the price, with the options already chosen:
  // Weight does on a coffee sold by weight, its Coffee type doesn't (every type
  // leads to the same prices), so a type shows no "From" price.
  const optionsChangingPrice = computed(() => {
    const changing = new Set()
    if (!variationPrices.value.size) return changing
    for (const attr of product.value?.attributes || []) {
      const seen = new Set()
      for (const term of attr.terms || []) {
        const found = fittingPrices({ ...selectedVariations.value, [attr.name]: term.name })
        if (found.length) seen.add([...new Set(found.map(p => `${p.price}/${p.regular_price}`))].sort().join(','))
      }
      if (seen.size > 1) changing.add(attr.name)
    }
    return changing
  })
  // A choice that costs the same as the other choices of its option (see above).
  function choiceSamePrice(attrName, value) {
    if (!variationPrices.value.size || value == null || optionsChangingPrice.value.has(attrName)) return false
    return fittingPrices({ ...selectedVariations.value, [attrName]: value }).length > 0
  }

  // The price shown on a choice: what the product costs with this option and the
  // options already chosen. One price (with the old one when on sale), else
  // "From" the lowest; '' when unknown, or when the option doesn't change the price.
  function choicePrice(attrName, value) {
    if (!variationPrices.value.size || value == null) return ''
    if (!optionsChangingPrice.value.has(attrName)) return ''
    const found = fittingPrices({ ...selectedVariations.value, [attrName]: value })
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

  const isVariable = computed(() => product.value?.type === 'variable')

  const selectedVariations = ref({})
  const selectedVariation = ref(null)
  const variationError = ref('')
  function resetVariations() {
    selectedVariations.value = {}
    variationError.value = ''
    selectedVariation.value = null
  }

  const shouldDisableCartButtons = computed(() => {
    return isVariable.value && (!selectedVariation.value || selectedVariation.value === 'null')
  })

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

      // The product page keeps the choices in the address.
      if (syncAddress) {
        // Update URL query params
        const url = new URL(window.location.href)
        url.search = ''

        for (const [key, value] of Object.entries(selectedVariations.value)) {
          if (value) {
            url.searchParams.set(key, value)
          }
        }

        window.history.replaceState({}, '', url.toString())
      }

    } finally {
      variationLoading.value = false
    }
  }

  // The chosen variation as the cart takes it: { id, variation: [{ attribute, value }] }, or
  // null when no variation fits the choices (a product without options).
  function chosenForCart() {
    const matchedVariation = (product.value?.variations || []).find((variation) => {
      return Object.entries(selectedVariations.value).every(([attrName, selectedValue]) => {
        const attr = variation.attributes.find(a => a.name === attrName);
        if (!attr || selectedValue === null) return false;
        if (attr.value === null) return true;
        return sameChoice(attrName, attr.value, selectedValue);
      });
    });
    if (!matchedVariation) return null

    const variation = []
    for (const attr of matchedVariation.attributes) {
      let resolvedValue = attr.value;

      if (resolvedValue === null || resolvedValue === 'null' || !resolvedValue) {
        resolvedValue = selectedVariations.value[attr.name] ?? '';
      }

      variation.push({ attribute: attr.name, value: resolvedValue });
    }
    return { id: matchedVariation.id, variation }
  }

  return {
    isVariable, selectedVariations, selectedVariation, variationError, variationLoading, resetVariations,
    shouldDisableCartButtons, availableAttributes, getOptionsWithDisabled,
    choicePrice, choicePricesDiffer, choiceSamePrice, loadVariationPrices, onVariationChange, chosenForCart,
  }
}
