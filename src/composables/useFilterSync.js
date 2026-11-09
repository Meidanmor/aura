// src/composables/useFilterSync.js

import { watch } from 'vue'
import { isEditorMode } from 'src/utils/config-loader.js'

// Attribute filters in the address: attr=pa_taste:12.13,pa_heat:5 (taxonomy: term ids).
export function parseAttr(value) {
  const out = {}
  for (const part of String(value || '').split(',')) {
    const [tax, ids] = part.split(':')
    if (!/^pa_[a-z0-9_-]+$/i.test(tax || '')) continue
    const list = String(ids || '').split('.').map(Number).filter((n) => Number.isInteger(n) && n > 0)
    if (list.length) out[tax] = list
  }
  return out
}
export function attrToString(attrs) {
  return Object.keys(attrs || {}).sort()
    .filter((tax) => Array.isArray(attrs[tax]) && attrs[tax].length)
    .map((tax) => `${tax}:${[...attrs[tax]].sort((a, b) => a - b).join('.')}`)
    .join(',')
}

export function parseQueryFilters(query) {
  const filters = {}

  if (query.q) {
    filters.search = String(query.q)
  }

  if (query.cat) {
    filters.selectedCategory = String(query.cat)
      .split(',')
      .map(Number)
      .filter(Boolean)
  }

  if (query.sort) {
    filters.sortBy = String(query.sort)
  }

  if (query.attr) {
    const attrs = parseAttr(query.attr)
    if (Object.keys(attrs).length) filters.attributes = attrs
  }

  if (query.stock === '1') filters.inStock = true

  if (query.page) {
    const p = parseInt(query.page, 10)
    if (!isNaN(p) && p > 0) filters.currentPage = p
  }

  const minRaw = parseFloat(query.min_price)
  const maxRaw = parseFloat(query.max_price)

  if (!isNaN(minRaw) || !isNaN(maxRaw)) {
    filters.priceRange = {
      min: !isNaN(minRaw) ? minRaw : null,
      max: !isNaN(maxRaw) ? maxRaw : null
    }
  }

  return filters
}

function buildQuery({ search, selectedCategory, priceRange, priceMin, priceMax, sortBy, currentPage, attributes, inStock }) {
  const q = {}

  if (search.value) q.q = search.value
  if (selectedCategory?.value?.length) q.cat = selectedCategory.value.join(',')
  const attr = attributes ? attrToString(attributes.value) : ''
  if (attr) q.attr = attr
  if (inStock?.value) q.stock = '1'
  if (sortBy.value && sortBy.value !== 'menu_order') q.sort = sortBy.value
  if (currentPage.value && currentPage.value > 1) q.page = currentPage.value

  const min = priceRange.value?.min
  const max = priceRange.value?.max
  const boundsLoaded = priceMin.value !== null && priceMax.value !== null && priceMin.value !== 0
  if (boundsLoaded) {
    if (min !== undefined && min !== priceMin.value) q.min_price = min
    if (max !== undefined && max !== priceMax.value) q.max_price = max
  }

  return q
}


/** The address parameters the filters own; any other (utm_source…) is kept as it is. */
const FILTER_KEYS = ['q', 'cat', 'attr', 'stock', 'sort', 'page', 'min_price', 'max_price']

/** The filters' part of a query, as strings in a fixed order (to compare two addresses). */
function filterPart(query) {
  const out = {}
  for (const key of FILTER_KEYS) {
    const value = Array.isArray(query?.[key]) ? query[key][0] : query?.[key]
    if (value !== null && value !== undefined && value !== '') out[key] = String(value)
  }
  return out
}
const sameFilters = (a, b) => JSON.stringify(filterPart(a)) === JSON.stringify(filterPart(b))

/** The query of the page's current address. */
function getUrlQuery() {
  const params = new URLSearchParams(window.location.search)
  const query = {}
  params.forEach((value, key) => {
    query[key] = value
  })
  return query
}

/**
 * Keeps the filters (search, categories, price, sort, page…) and the page's address in step,
 * through the router, so each change is a step in the browser's history like a page change:
 * Back after opening a product returns to page 2, and Back / Forward between filter states
 * shows each one again.
 *
 * Changes made while dragging the price or typing a search are one step, not one per move:
 * a price-only or search-only change right after one of the same kind replaces the last step.
 *
 * @param {object} refs  - { search, selectedCategory, priceRange, priceMin, priceMax, sortBy, currentPage, attributes, inStock }
 * @param {object} router
 * @param {object} route
 * @param {object} options - syncPrice: false to ignore the price in the address;
 *                           onAddress(): called after the filters were set from the address (Back / Forward)
 *                           replacePage(): true when a change of the page only replaces the address
 *                           (Load more: Back leaves the list, it doesn't step back through it)
 */
export function useFilterSync(refs, router, route, options = {}) {
  const { search, selectedCategory, priceRange, priceMin, priceMax, sortBy, currentPage, attributes, inStock } = refs

  function priceFrom(filters) {
    const range = filters.priceRange
    if (!range || options.syncPrice === false) return { min: priceMin.value, max: priceMax.value }
    return {
      min: range.min !== null ? Math.max(range.min, priceMin.value ?? range.min) : priceMin.value,
      max: range.max !== null ? Math.min(range.max, priceMax.value ?? range.max) : priceMax.value,
    }
  }

  function initFromQuery() {
    const filters = parseQueryFilters(getUrlQuery()) // ✅ reads from window.location

    if (filters.search !== undefined)           search.value            = filters.search
    if (filters.selectedCategory !== undefined && selectedCategory) selectedCategory.value = filters.selectedCategory
    if (filters.sortBy !== undefined)           sortBy.value            = filters.sortBy
    if (filters.currentPage !== undefined)      currentPage.value       = filters.currentPage
    if (filters.attributes !== undefined && attributes) attributes.value = filters.attributes
    if (filters.inStock !== undefined && inStock)       inStock.value    = filters.inStock

    if (filters.priceRange && options.syncPrice !== false) priceRange.value = priceFrom(filters)
  }

  // Back / Forward to another filter state of this page: every filter as the address says,
  // and the ones it doesn't mention back to their defaults.
  let fromAddress = false
  function applyAddress(query) {
    const filters = parseQueryFilters(query)
    fromAddress = true
    search.value = filters.search ?? ''
    if (selectedCategory) selectedCategory.value = filters.selectedCategory ?? []
    sortBy.value = filters.sortBy ?? 'menu_order'
    currentPage.value = filters.currentPage ?? 1
    if (attributes) attributes.value = filters.attributes ?? {}
    if (inStock) inStock.value = !!filters.inStock
    if (options.syncPrice !== false) priceRange.value = priceFrom(filters)
    options.onAddress?.()
  }

  let last = { kind: '', at: 0 }
  let pageReset = false // the page went back to 1 because another filter changed (partOfLastStep)
  function kindOf(changed) {
    if (changed.length && changed.every((key) => key === 'priceMin' || key === 'priceMax')) return 'price'
    if (changed.length === 1 && changed[0] === 'search') return 'search'
    return 'other'
  }

  function startWatching() {
    watch(
      () => ({
        search:           search.value,
        selectedCategory: [...(selectedCategory ? selectedCategory.value : [])],
        priceMin:         priceRange.value?.min,
        priceMax:         priceRange.value?.max,
        sortBy:           sortBy.value,
        currentPage:      currentPage.value,
        attributes:       attributes ? attrToString(attributes.value) : '',
        inStock:          !!inStock?.value,
      }),
      (next, prev) => {
        // Set from the address (Back / Forward): the address is already right, unless the
        // filters had to correct it (a price outside the range…): then it's corrected in place.
        const fromBack = fromAddress
        fromAddress = false
        // Inside the Store builder's preview the address keeps its editor parameters.
        if (isEditorMode()) return

        const newQuery = buildQuery({ search, selectedCategory, priceRange, priceMin, priceMax, sortBy, currentPage, attributes, inStock })
        if (sameFilters(newQuery, route.query)) return

        const now = Date.now()
        const reset = pageReset
        pageReset = false
        let changed = Object.keys(next).filter((key) => JSON.stringify(next[key]) !== JSON.stringify(prev?.[key]))
        // Back to page 1 because another filter changed: part of that change, in the same update
        // (a search) or in the next one (the end of a price drag).
        if (reset && next.currentPage === 1 && changed.length > 1) changed = changed.filter((key) => key !== 'currentPage')
        const resetOnly = reset && changed.length === 1 && changed[0] === 'currentPage'
        const kind = resetOnly ? last.kind : kindOf(changed)
        // One step for a whole price drag or a typed search.
        const pageOnly = changed.length === 1 && changed[0] === 'currentPage'
        const replace = fromBack || resetOnly || (pageOnly && !!options.replacePage?.()) ||
          (kind !== 'other' && kind === last.kind && now - last.at < 1500)
        last = { kind, at: now }

        const kept = {}
        for (const [key, value] of Object.entries(route.query)) if (!FILTER_KEYS.includes(key)) kept[key] = value
        const to = { path: route.path, query: { ...kept, ...filterPart(newQuery) }, hash: route.hash }
        ;(replace ? router.replace(to) : router.push(to)).catch(() => {})
      },
      { deep: true }
    )

    // Back / Forward between this page's filter states (an address change that also changes the
    // path, to another category or a product, isn't one).
    watch(
      () => [route.path, route.fullPath],
      ([path], [oldPath]) => {
        if (path !== oldPath || sameFilters(route.query, currentFilters())) return
        applyAddress(route.query)
      }
    )
  }

  // The page goes back to page 1 because another filter changed: the address keeps it in that step.
  function partOfLastStep() {
    pageReset = true
  }

  const currentFilters = () => buildQuery({ search, selectedCategory, priceRange, priceMin, priceMax, sortBy, currentPage, attributes, inStock })

  return { initFromQuery, startWatching, partOfLastStep }
}
