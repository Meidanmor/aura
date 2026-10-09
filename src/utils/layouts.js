// Layouts with conditions (Store builder): a page's config has its default
// `sections` and `layouts`, each { id, conditions, sections }. The first
// layout whose conditions match is used; in the live preview, the layout the
// owner is editing (`preview_layout`).

const has = (list, value) => Array.isArray(list) && value !== undefined && value !== null && list.map(String).includes(String(value))

/** The sections to show for a page's config, given a matcher for layout conditions. */
export function pickSections(config, match) {
  if (!config) return []
  const layouts = Array.isArray(config.layouts) ? config.layouts : []
  if (config.preview_layout) {
    const editing = layouts.find((l) => l.id === config.preview_layout)
    if (editing) return editing.sections || []
  }
  for (const layout of layouts) {
    if (match(layout.conditions || {})) return layout.sections || []
  }
  return config.sections || []
}

/** A product: one of the chosen products, or in one of the chosen categories. */
export const productMatch = (product) => (c) =>
  has(c.products, product?.id) || (product?.categories || []).some((cat) => has(c.categories, cat.id))

/** A product category page. */
export const categoryMatch = (category) => (c) => has(c.categories, category?.id) || has(c.categories_slugs, category?.slug)

/** A blog category page (by its address). */
export const blogCategoryMatch = (slug) => (c) => !!slug && has(c.blog_categories_slugs, slug)

/** A blog post: in one of the chosen blog categories. */
export const postMatch = (post) => (c) => (post?.categories || []).some((cat) => has(c.blog_categories_slugs, cat.slug))
