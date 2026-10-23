// src/composables/useFilterSync.js

import { watch } from 'vue'

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

// ✅ Replaces router.replace — updates URL without triggering Vue Router navigation
function pushToUrl(query) {
  const url = new URL(window.location.href)
  url.search = ''

  Object.entries(query).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  history.replaceState(history.state, '', url.toString())
}

// ✅ Replaces route.query — reads directly from the browser URL
function getUrlQuery() {
  const params = new URLSearchParams(window.location.search)
  const query = {}
  params.forEach((value, key) => {
    query[key] = value
  })
  return query
}

/**
 * @param {object} refs    - { search, selectedCategory, priceRange, priceMin, priceMax, sortBy, currentPage }
 * @param {object} _router - no longer used, kept for backwards compatibility so call sites don't break
 * @param {object} _route  - no longer used, kept for backwards compatibility
 * @param {object} options
 */
export function useFilterSync(refs, _router, _route, options = {}) {
  const { search, selectedCategory, priceRange, priceMin, priceMax, sortBy, currentPage, attributes, inStock } = refs

  function initFromQuery() {
    const filters = parseQueryFilters(getUrlQuery()) // ✅ reads from window.location

    if (filters.search !== undefined)           search.value            = filters.search
    if (filters.selectedCategory !== undefined) selectedCategory.value  = filters.selectedCategory
    if (filters.sortBy !== undefined)           sortBy.value            = filters.sortBy
    if (filters.currentPage !== undefined)      currentPage.value       = filters.currentPage
    if (filters.attributes !== undefined && attributes) attributes.value = filters.attributes
    if (filters.inStock !== undefined && inStock)       inStock.value    = filters.inStock

    if (filters.priceRange && options.syncPrice !== false) {
      const clampedMin = filters.priceRange.min !== null
        ? Math.max(filters.priceRange.min, priceMin.value ?? filters.priceRange.min)
        : priceMin.value

      const clampedMax = filters.priceRange.max !== null
        ? Math.min(filters.priceRange.max, priceMax.value ?? filters.priceRange.max)
        : priceMax.value

      priceRange.value = { min: clampedMin, max: clampedMax }
    }
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
      () => {
        const newQuery    = buildQuery({ search, selectedCategory, priceRange, priceMin, priceMax, sortBy, currentPage, attributes, inStock })
        const currentQuery = getUrlQuery()                              // ✅ reads from window.location

        const isSame = JSON.stringify(newQuery) === JSON.stringify(currentQuery)
        if (!isSame) {
          pushToUrl(newQuery)                                           // ✅ history.replaceState, not router.replace
        }
      },
      { deep: true }
    )
  }

  return { initFromQuery, startWatching }
}