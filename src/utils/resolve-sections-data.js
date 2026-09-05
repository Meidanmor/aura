/**
 * Most section types from the Shop Builder plugin (banner, newsletter_signup,
 * testimonials, custom) are already fully self-contained — text, colors, and
 * (for `custom`) image URLs are resolved to real URLs on the WP side before
 * being pushed, so they can render as-is.
 *
 * category_grid is the one exception: it only stores raw WooCommerce
 * category IDs (`category_ids`), so the frontend has to resolve those into
 * displayable data (name/slug/image) itself. This runs that resolution
 * server-side in preFetch(), mirroring how resolveFeaturedProducts() turns
 * featured_products ids into full product objects — so category_grid
 * renders correctly in the initial SSR/no-JS HTML instead of popping in
 * after a client-side fetch.
 *
 * IMPORTANT: this calls WooCommerce's public Store API
 * (`/wp-json/wc/store/v1/products/categories`) as a reasonable default. If
 * you already have a categories store/composable (the way `productsStore`
 * exists for products), swap the fetch below for that instead — it'll be
 * more consistent with the rest of the app (caching, error handling, etc).
 */
export async function resolveSectionsData(sections, apiOrigin) {
    if (!Array.isArray(sections)) return sections

    return Promise.all(
        sections.map(async (section) => {
            if (section?.type !== 'category_grid' || !section?.data?.category_ids?.length) {
                return section
            }

            try {
                const ids = section.data.category_ids.join(',')
                const res = await fetch(`${apiOrigin}/wp-json/wc/store/v1/products/categories?include=${ids}`)

                if (!res.ok) {
                    console.error(`Failed to resolve categories for section ${section.id}: HTTP ${res.status}`)
                    return section
                }

                const json = await res.json()
                const categories = (Array.isArray(json) ? json : []).map((cat) => ({
                    id: cat.id,
                    name: cat.name,
                    slug: cat.slug,
                    image: cat.image?.src || ''
                }))

                return {
                    ...section,
                    data: { ...section.data, categories }
                }
            } catch (err) {
                console.error(`Failed to resolve categories for section ${section.id}:`, err)
                return section
            }
        })
    )
}