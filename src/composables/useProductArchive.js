// src/composables/useProductArchive.js
import {ref, computed, onMounted, watch, useSSRContext, nextTick, onUnmounted} from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFilterSync, parseQueryFilters, attrToString } from 'src/composables/useFilterSync'
import { scroll } from 'quasar'
import { fetchSeoForPath, useSeoMeta } from 'src/composables/useSeo'
import productsStore from 'src/stores/products'
import { sameSlug } from 'src/utils/slug.js'
import {getApiOrigin} from "src/utils/server/get-api-origin.js";
import {loadPageConfig, subscribeToLiveConfig} from "src/utils/config-loader.js";
import { archiveGrid, shopSections } from 'src/utils/shop-templates.js'
import { categoryMatch } from 'src/utils/layouts.js'

const { setVerticalScrollPosition } = scroll
let unsubscribeLiveConfig = () => {}

export function getSortParams(sort) {
    switch (sort) {
        case 'price_asc':  return { orderby: 'price',      order: 'asc'  }
        case 'price_desc': return { orderby: 'price',      order: 'desc' }
        case 'date_desc':  return { orderby: 'date',       order: 'desc' }
        case 'title_asc':  return { orderby: 'title',      order: 'asc'  }
        case 'title_desc': return { orderby: 'title',      order: 'desc' }
        case 'popularity': return { orderby: 'popularity', order: 'desc' }
        case 'rating':     return { orderby: 'rating',     order: 'desc' }
        default:           return { orderby: 'menu_order', order: 'desc' }
    }
}

export const sortOptions = [
    { label: 'Default',            value: 'menu_order' },
    { label: 'Newest',             value: 'date_desc'  },
    { label: 'Price: Low to High', value: 'price_asc'  },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Name: A to Z',       value: 'title_asc'  },
    { label: 'Name: Z to A',       value: 'title_desc' },
    { label: 'Popularity',         value: 'popularity' },
    { label: 'Rating',             value: 'rating'     },
]


/** The Products Grid's paging on this page (its layout for the category): { perPage, mode }. */
export function archiveGridFor(mode, config, category = null) {
    const page = mode === 'category' ? 'category' : 'shop'
    return archiveGrid(shopSections(page, config, mode === 'category' ? categoryMatch(category) : undefined))
}

/** Load more / Load while scrolling: the list holds pages 1…current, not one page. */
export const gridAppends = (grid) => grid?.mode === 'button' || grid?.mode === 'scroll'

/**
 * mode: 'shop'     -> category comes from URL (checkbox multi-select)
 *       'category' -> category is locked to route.params.slug
 */
export function createArchivePreFetch(mode) {
    return async function preFetch({ ssrContext, currentRoute, previousRoute, redirect }) {
        // Only the filters changed (same page, another query): the page loads the products itself.
        if (!ssrContext && previousRoute?.matched?.length && previousRoute.path === currentRoute.path) return

        const isPreview = currentRoute.query.preview === 'true'
        const origin = getApiOrigin(ssrContext)
        const seoPath = mode === 'category'
            ? `product-category/${currentRoute.params.slug}`
            : 'shop'
        const urlFilters = parseQueryFilters(currentRoute.query)
        const sortParams = getSortParams(urlFilters.sortBy || 'menu_order')
        const requestedPage = urlFilters.currentPage || 1

        // Everything that doesn't need the category's id is asked at the same time (each call to the
        // store takes a few hundred ms: one after another, they added up to the page's wait).
        const configPromise = loadPageConfig((mode === 'category' ? 'category' : 'shop'), isPreview, origin)
        const categoriesPromise = productsStore.prefetchCategories(ssrContext)
        const seoPromise = fetchSeoForPath(seoPath, origin)
        // The Products Grid says how many products a page has (the config is in memory: no wait).
        const shopListPromise = mode === 'category' ? null : configPromise.then((cfg) =>
            listFor(urlFilters.selectedCategory?.length ? urlFilters.selectedCategory : null, archiveGridFor(mode, cfg)))

        const [configData, categories, seo] = await Promise.all([configPromise, categoriesPromise, seoPromise])
        // The owner changed the category's address: send visitors to the new one.
        if (seo.redirect) {
            shopListPromise?.catch(() => {})
            redirect(seo.redirect, 301)
            return
        }

        const currentCat = mode === 'category'
            ? categories.find(c => sameSlug(c.slug, currentRoute.params.slug)) || null
            : null

        // The products and their price range (a category page needs its id first).
        // Load more opened at ?page=3: pages 1 to 3 (Back from a product shows the same list).
        function listFor(category, grid) {
            const params = {
                api: true,
                per_page: grid.perPage,
                search: urlFilters.search || undefined,
                category: Array.isArray(category) ? category.join(',') : (category ?? undefined),
                min_amount: urlFilters.priceRange?.min ?? undefined,
                max_amount: urlFilters.priceRange?.max ?? undefined,
                attributes: urlFilters.attributes,
                in_stock: !!urlFilters.inStock,
                ssrContext,
                ...sortParams
            }
            return Promise.all([
                gridAppends(grid) && requestedPage > 1
                    ? productsStore.fetchProductPages(params, requestedPage)
                    : productsStore.preFetchProducts({ ...params, page: requestedPage, dryRun: true }),
                productsStore.prefetchPriceMeta(category, ssrContext),
            ])
        }

        const [result, priceMeta] = await (shopListPromise || listFor(currentCat?.id ?? null, archiveGridFor(mode, configData, currentCat)))

        // ✅ shared page-existence guard
        const totalPages = result.totalPages || 1
        if (requestedPage > totalPages || requestedPage < 1) {
            const cleanQuery = { ...currentRoute.query }
            delete cleanQuery.page
            return redirect({ path: currentRoute.path, query: cleanQuery })
        }

        if (ssrContext) {
            ssrContext.urlFilters = urlFilters
            ssrContext.productsData = result.products
            ssrContext.categoriesData = categories
            ssrContext.priceMeta = priceMeta
            ssrContext.productsTotal = result.total
            ssrContext.pagesTotal = result.totalPages
            ssrContext.seoData = seo
            ssrContext.pageConfig = configData

            if (mode === 'category') ssrContext.selectedCategoryData = currentCat
        } else {
            window.__PRODUCTS_DATA__ = result.products
            window.__PRODUCTS_TOTAL__ = result.total
            window.__PAGES_TOTAL__ = result.totalPages
            window.__CATEGORIES_DATA__ = categories
            window.__PRICE_META__ = priceMeta
            window.__SEO_DATA__ = seo
            window.__PAGE_CONFIG__ = configData;
            if (mode === 'category') window.__SELECTED_CATEGORY_DATA__ = currentCat
        }

        productsStore.products.value = result.products
        productsStore.totalProducts.value = result.total
        productsStore.totalPages.value = result.totalPages
        productsStore.productsLoading.value = false
    }
}

export function useProductArchive(mode) {
    const router = useRouter()
    const route  = useRoute()

    function scrollToTop() {
        setVerticalScrollPosition(window, 187, 300)
    }

    const selectedCategory    = ref([])
    const selectedCategoryOBJ = ref(null) // meaningful only in 'category' mode
    const search              = ref('')
    const currentPage         = ref(1)
    const sortBy              = ref('menu_order')
    const filtersOpen         = ref(false)
    const isReady             = ref(false)
    const isInitialising      = ref(true)
    const priceMin            = ref(null)
    const priceMax            = ref(null)
    const priceRange          = ref({ min: 0, max: 1000 })
    const priceChanged        = ref(0)
    const pendingPriceRange   = ref(null)
    // Filters block: product attributes ({ pa_taste: [termId…] }) and "in stock only".
    const selectedAttributes  = ref({})
    const inStock             = ref(false)
    const attributeOptions    = ref([])
    let attributesLoading     = null
    function loadAttributeOptions() {
        if (!process.env.CLIENT) return
        attributesLoading ||= productsStore.fetchAttributeOptions().then((list) => { attributeOptions.value = list })
        return attributesLoading
    }
    const shopSettings = ref(
        process.env.CLIENT && window.__PAGE_CONFIG__
            ? window.__PAGE_CONFIG__
            : null
    )

    // Products Grid → Pagination: products per page and how more of them come.
    const grid        = computed(() => archiveGridFor(mode, shopSettings.value, selectedCategoryOBJ.value))
    const perPage     = () => grid.value.perPage
    const appends     = () => gridAppends(grid.value)
    const loadingMore = ref(false)

    const { seoData } = useSeoMeta()
    // No such category: the page shows the 404 page and answers 404.
    const notFound = computed(() => mode === 'category' && !!seoData.value?.not_found)

    if (process.env.SERVER) {
        const ssr = useSSRContext()
        if (ssr) {
            shopSettings.value = ssr?.pageConfig || null

            productsStore.categories.value = ssr.categoriesData || []

            if (mode === 'category') {
                selectedCategoryOBJ.value = ssr.selectedCategoryData || null
                selectedCategory.value = ssr.selectedCategoryData ? [ssr.selectedCategoryData.id] : []
            } else {
                selectedCategory.value = ssr.urlFilters?.selectedCategory || []
            }

            if (ssr.priceMeta) {
                priceMin.value = Number(ssr.priceMeta.min_price) || 0
                priceMax.value = Number(ssr.priceMeta.max_price) || 0
                priceRange.value = (ssr.urlFilters?.priceRange?.min || ssr.urlFilters?.priceRange?.max)
                    ? { min: ssr.urlFilters.priceRange.min ?? priceMin.value, max: ssr.urlFilters.priceRange.max ?? priceMax.value }
                    : { min: priceMin.value, max: priceMax.value }
            }

            if (ssr.urlFilters?.attributes) selectedAttributes.value = ssr.urlFilters.attributes
            if (ssr.urlFilters?.inStock) inStock.value = true
            if (ssr.urlFilters?.sortBy) sortBy.value = ssr.urlFilters.sortBy
            if (ssr.urlFilters?.currentPage) currentPage.value = ssr.urlFilters.currentPage
        }
    }

    const { initFromQuery, startWatching, partOfLastStep } = useFilterSync(
        mode === 'category'
            ? { search, priceRange, priceMin, priceMax, sortBy, currentPage, attributes: selectedAttributes, inStock }
            : { search, selectedCategory, priceRange, priceMin, priceMax, sortBy, currentPage, attributes: selectedAttributes, inStock },
        router, route,
        {
            // Load more: the address follows the list without a history step of its own.
            replacePage: appends,
            onAddress() {
                filtersFromAddress = true
                priceChanged.value++
            }
        }
    )


    const isHydrated = ref(
        process.env.CLIENT && (productsStore.initialized.value === true || !!(window.__PRODUCTS_DATA__?.length))
    )

    if (process.env.CLIENT) {


        if (window.__PAGE_CONFIG__ && Object.keys(window.__PAGE_CONFIG__).length) {
            shopSettings.value = window.__PAGE_CONFIG__
        }
        const hasSSRProducts = Array.isArray(window.__PRODUCTS_DATA__) && window.__PRODUCTS_DATA__.length
        const currentCatFromWindow = mode === 'category'
            ? (window.__CATEGORIES_DATA__ || []).find(c => sameSlug(c.slug, route.params.slug)) || null
            : null

        if (hasSSRProducts) {
            productsStore.categories.value = window.__CATEGORIES_DATA__ || []
            productsStore.products.value = window.__PRODUCTS_DATA__
            productsStore.initialized.value = true
            productsStore.productsLoading.value = false

            if (mode === 'category') {
                selectedCategoryOBJ.value = window.__SELECTED_CATEGORY_DATA__ || currentCatFromWindow
                selectedCategory.value = selectedCategoryOBJ.value ? [selectedCategoryOBJ.value.id] : []
            }

            if (window.__PRICE_META__) {
                priceMin.value = Number(window.__PRICE_META__.min_price) || 0
                priceMax.value = Number(window.__PRICE_META__.max_price) || 0
                priceRange.value = { min: priceMin.value, max: priceMax.value }
            }

            if (window.__PRODUCTS_TOTAL__) productsStore.totalProducts.value = window.__PRODUCTS_TOTAL__
            if (window.__PAGES_TOTAL__) productsStore.totalPages.value = window.__PAGES_TOTAL__

            initFromQuery()
        } else if (productsStore.initialized.value) {
            productsStore.categories.value = window.__CATEGORIES_DATA__ || []

            if (mode === 'category') {
                selectedCategoryOBJ.value = currentCatFromWindow
                selectedCategory.value = currentCatFromWindow ? [currentCatFromWindow.id] : []
            }

            if (window.__PRICE_META__) {
                priceMin.value = Number(window.__PRICE_META__.min_price)
                priceMax.value = Number(window.__PRICE_META__.max_price)
                priceRange.value = { min: priceMin.value, max: priceMax.value }
            }
            initFromQuery()
        }

        isReady.value = true
    }

    const decodeHtml = (html = '') => html
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#039;/g, "'")

    const categoryOptions = computed(() => {
        if (!Array.isArray(productsStore.categories.value)) return []
        return productsStore.categories.value.map(cat => ({ label: decodeHtml(cat.name), value: cat.id }))
    })

    const paginatedProducts = computed(() => productsStore.products.value || [])
    const totalPages    = computed(() => productsStore.totalPages.value)
    const totalProducts = computed(() => productsStore.totalProducts.value)

    if (process.env.CLIENT && window.__PRODUCTS_TOTAL__) productsStore.totalProducts.value = window.__PRODUCTS_TOTAL__
    if (process.env.CLIENT && window.__PAGES_TOTAL__) productsStore.totalPages.value = window.__PAGES_TOTAL__

    function onPriceChange() { priceChanged.value++ }

    async function fetchPriceMeta(category = null) {
        const data = await productsStore.prefetchPriceMeta(category)
        pendingPriceRange.value = { min: Number(data.min_price), max: Number(data.max_price) }
        return data
    }

    let requestId = 0
    // Set by Back / Forward (useFilterSync): the address says the page too, so a new search or
    // category doesn't send it back to page 1, and its price stays as the address says.
    let filtersFromAddress = false
    const priceFromAddress = () => {
        const range = parseQueryFilters(route.query).priceRange
        return {
            min: range?.min != null ? Math.max(range.min, priceMin.value) : priceMin.value,
            max: range?.max != null ? Math.min(range.max, priceMax.value) : priceMax.value,
        }
    }
    watch(
        () => ({
            category: selectedCategory.value,
            search: search.value,
            page: currentPage.value,
            sort: sortBy.value,
            priceTrigger: priceChanged.value,
            attributes: attrToString(selectedAttributes.value),
            inStock: inStock.value,
            grid: `${grid.value.perPage}:${grid.value.mode}`,
        }),
        async (filters, prev) => {
            const fromAddress = filtersFromAddress
            filtersFromAddress = false
            if (isInitialising.value || !isReady.value || priceRange.value.min === null || priceRange.value.max === null) return

            const currentRequest = ++requestId

            const categoryChanged = mode === 'shop' && prev &&
                JSON.stringify([...filters.category].sort()) !== JSON.stringify([...prev.category].sort())

            const shouldResetPage = prev && (
                filters.search !== prev.search || filters.priceTrigger !== prev.priceTrigger || categoryChanged ||
                filters.attributes !== prev.attributes || filters.inStock !== prev.inStock || filters.grid !== prev.grid
            )

            if (categoryChanged) {
                productsStore.productsLoading.value = true
                await fetchPriceMeta(filters.category)
                priceMin.value = pendingPriceRange.value.min
                priceMax.value = pendingPriceRange.value.max
                priceRange.value = fromAddress ? priceFromAddress() : { ...pendingPriceRange.value }
            }

            if (currentRequest !== requestId) return
            if (shouldResetPage && !fromAddress && currentPage.value !== 1) {
                partOfLastStep()
                currentPage.value = 1
                return
            }

            const sortParams = getSortParams(filters.sort)

            const categoryArg = mode === 'category'
                ? (selectedCategoryOBJ.value?.id ?? null)
                : (filters.category.length ? filters.category.join(',') : null)

            const params = {
                api: true, per_page: perPage(),
                min_amount: priceRange.value.min, max_amount: priceRange.value.max, category: categoryArg,
                search: filters.search, attributes: selectedAttributes.value, in_stock: inStock.value, ...sortParams
            }
            const nextOnly = prev && !shouldResetPage && !categoryChanged && !fromAddress &&
                filters.sort === prev.sort && filters.page === prev.page + 1

            if (!appends()) {
                loadingMore.value = false
                await productsStore.preFetchProducts({ ...params, page: currentPage.value })
            } else if (nextOnly) {
                // Load more: the next page joins the list.
                loadingMore.value = true
                const r = await productsStore.preFetchProducts({ ...params, page: filters.page, dryRun: true })
                if (currentRequest !== requestId) return
                loadingMore.value = false
                const have = new Set((productsStore.products.value || []).map((p) => p.id))
                productsStore.products.value = [...(productsStore.products.value || []), ...(r.products || []).filter((p) => !have.has(p.id))]
                productsStore.totalProducts.value = r.total
                productsStore.totalPages.value = r.totalPages
            } else {
                // Anything else: pages 1…current again.
                loadingMore.value = false
                productsStore.productsLoading.value = true
                const r = await productsStore.fetchProductPages(params, currentPage.value)
                if (currentRequest !== requestId) return
                productsStore.products.value = r.products
                productsStore.totalProducts.value = r.total
                productsStore.totalPages.value = r.totalPages
                productsStore.productsLoading.value = false
            }

            if (currentRequest !== requestId) return
            if (categoryChanged) {
                priceMin.value = pendingPriceRange.value.min
                priceMax.value = pendingPriceRange.value.max
                priceRange.value = fromAddress ? priceFromAddress() : { ...pendingPriceRange.value }
            }
        }
    )

    // ── only category pages react to slug changes (nav between categories) ──
    if (mode === 'category') {
        watch(
            () => route.params.slug,
            async (newSlug) => {
                // Leaving for another kind of page (a product's slug): not a category change.
                if (!route.path.includes('/product-category/')) return
                fetchSeoForPath(`product-category/${newSlug}`).then((seo) => { seoData.value = seo })
                if (!Array.isArray(productsStore.categories.value) || !productsStore.categories.value.length) {
                    await productsStore.prefetchCategories()
                }
                const cat = productsStore.categories.value.find(c => sameSlug(c.slug, newSlug))
                if (!cat) return

                selectedCategoryOBJ.value = cat
                selectedCategory.value = [cat.id]
                productsStore.products.value = []
                productsStore.productsLoading.value = true

                await fetchPriceMeta(cat.id)
                priceMin.value = pendingPriceRange.value.min
                priceMax.value = pendingPriceRange.value.max
                priceRange.value = { ...pendingPriceRange.value }

                await productsStore.preFetchProducts({ api: true, page: 1, per_page: perPage(), category: cat.id })
                productsStore.productsLoading.value = false
            }
        )
    }

    onMounted(async () => {
        isHydrated.value = true


        if (window.__PAGE_CONFIG__ && Object.keys(window.__PAGE_CONFIG__).length) {
            shopSettings.value = window.__PAGE_CONFIG__
        } else {
            const isPreview = route.query.preview === 'true'
            // Use it directly
            const freshConfig = await loadPageConfig((mode === 'category' ? 'category' : 'shop'), isPreview)
            if (freshConfig) {
                shopSettings.value = freshConfig
            }
        }

        unsubscribeLiveConfig = subscribeToLiveConfig((mode === 'category' ? 'category' : 'shop'), (data) => {
            shopSettings.value = data
        })


        if (mode === 'category' && window.__SELECTED_CATEGORY_DATA__) {
            selectedCategoryOBJ.value = window.__SELECTED_CATEGORY_DATA__
            selectedCategory.value = [window.__SELECTED_CATEGORY_DATA__.id]
            window.__SELECTED_CATEGORY_DATA__ = null
        }

        if (window.__PRODUCTS_DATA__) {
            productsStore.products.value = window.__PRODUCTS_DATA__
            productsStore.totalProducts.value = window.__PRODUCTS_TOTAL__
            productsStore.totalPages.value = window.__PAGES_TOTAL__
            productsStore.initialized.value = true
            productsStore.productsLoading.value = false
            window.__PRODUCTS_DATA__ = null
            window.__PRODUCTS_TOTAL__ = null
            window.__PAGES_TOTAL__ = null
        } else if (!productsStore.initialized.value) {
            productsStore.productsLoading.value = true
            await productsStore.preFetchProducts({
                api: true, page: 1, per_page: perPage(),
                category: mode === 'category' ? (selectedCategoryOBJ.value?.id || null) : undefined
            })
        }

        if (priceMin.value == null) {
            await fetchPriceMeta(mode === 'category' ? (selectedCategoryOBJ.value?.id || null) : null)
            priceMin.value = pendingPriceRange.value.min
            priceMax.value = pendingPriceRange.value.max
            priceRange.value = { ...pendingPriceRange.value }
            initFromQuery()
        }

        if (!Array.isArray(productsStore.categories.value) || !productsStore.categories.value.length) {
            await productsStore.prefetchCategories()
        }

        if (!isReady.value) isReady.value = true

        startWatching()
        await nextTick()
        isInitialising.value = false
    })

    onUnmounted(() => {
        unsubscribeLiveConfig()
    })

    /** Load more / Load while scrolling: the next page joins the list (the address says ?page=N). */
    function loadMore() {
        if (loadingMore.value || productsStore.productsLoading.value) return
        if (currentPage.value >= (productsStore.totalPages.value || 1)) return
        currentPage.value++
    }


    return {
        search, selectedCategory, selectedCategoryOBJ, currentPage, sortBy, filtersOpen,
        priceMin, priceMax, priceRange, isHydrated,
        selectedAttributes, inStock, attributeOptions, loadAttributeOptions,
        categoryOptions, paginatedProducts, totalPages, totalProducts,
        sortOptions, onPriceChange, scrollToTop, productsStore, shopSettings, notFound,
        grid, loadingMore, loadMore
    }
}