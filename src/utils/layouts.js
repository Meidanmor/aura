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

/* ---------- Header and footer templates ---------- */

import { stripLang } from 'src/i18n/lang.js'

/**
 * What kind of page a route is, for header / footer templates
 * (CHROME_TARGETS in the store's class-sb-constants.php): { target, path },
 * path = an own page's address (custom pages only).
 */
export function chromeTarget(route) {
  const path = stripLang(String(route?.path || '')).replace(/\/+$/, '')
  const name = String(route?.name || '').split('@')[0]
  if (path === '') return { target: 'home' }
  if (name === 'custom-page') return { target: 'page', path: path.replace(/^\//, '') }
  if (name === 'products') return { target: 'shop' }
  if (name === 'search') return { target: 'search' }
  if (name === 'blog' || name === 'blog-category') return { target: 'blog' }
  if (name === 'blog-post') return { target: 'blog_post' }
  if (['my-account', 'forgot-password', 'reset-password'].includes(name)) return { target: 'account' }
  if (/^\/product\//.test(path)) return { target: 'product' }
  if (/^\/product-category\//.test(path)) return { target: 'category' }
  if (path === '/cart') return { target: 'cart' }
  if (path === '/checkout') return { target: 'checkout' }
  return { target: '' }
}

/** Whether a template's conditions take this page. */
export function chromeMatch(conditions, where) {
  const targets = Array.isArray(conditions?.targets) ? conditions.targets : []
  if (where.target === 'page') {
    return targets.includes('pages') || (Array.isArray(conditions?.page_paths) && conditions.page_paths.includes(where.path))
  }
  return !!where.target && targets.includes(where.target)
}

/**
 * The header or footer config to show on this route: the first template
 * that takes the page (its sections and, for a header, its settings), else
 * the main one. In the live preview, the template being edited.
 */
export function pickChrome(config, route) {
  if (!config) return config
  const layouts = Array.isArray(config.layouts) ? config.layouts : []
  let chosen = null
  if (config.preview_layout) chosen = layouts.find((l) => l.id === config.preview_layout) || null
  if (!chosen) {
    const where = chromeTarget(route)
    chosen = layouts.find((l) => chromeMatch(l.conditions, where)) || null
  }
  if (!chosen) return config
  return { ...config, sections: chosen.sections || [], settings: chosen.settings || config.settings, template: chosen.id }
}
