import { ref } from 'vue'

/**
 * Generic per-section-instance async data resolver, used by any homepage
 * section component that needs to turn raw config (ids, etc.) into real
 * data before it can render — e.g. featured_products (product_ids ->
 * products) and category_grid (category_ids -> categories).
 *
 * This exposes a plain resolve() function rather than registering its own
 * onServerPrefetch/onMounted hooks, so the calling component keeps exactly
 * one of each and controls the ordering itself (e.g. resolve data, THEN
 * recompute a carousel from it). Vue runs a component's onServerPrefetch
 * callbacks concurrently, not in registration order, so splitting this
 * across two separate hooks in the same component isn't safe.
 *
 * `sectionId` must be the section's own `id` from home.json (e.g.
 * "sec_1d2jbvo8uz") — stable and unique per section instance. It keys the
 * shared `ssrContext.sectionsData` / `window.__SECTIONS_DATA__` bucket
 * (see ssr-src/middlewares/render.js) so the client adopts the exact data
 * the server resolved instead of re-fetching and risking a mismatch.
 */
export function useSectionData(sectionId, resolver) {
    const data = ref(
        (process.env.CLIENT && window.__SECTIONS_DATA__?.[sectionId]) || null
    )

    async function resolve(ssrContext = null) {
        data.value = await resolver(ssrContext)

        if (ssrContext) {
            ssrContext.sectionsData = ssrContext.sectionsData || {}
            ssrContext.sectionsData[sectionId] = data.value
        }

        return data.value
    }

    return { data, resolve }
}