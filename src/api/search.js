// The storefront's search (Search block and /search): products and product
// categories from WooCommerce's Store API, blog posts from qwoo/v1/blog.
// Browser only: the search box and the search page load their results there.
import { fetchBlogList } from 'src/api/blog.js'

export const SEARCH_TYPES = ['products', 'categories', 'posts']

/** The kinds of results asked for ("products,posts" → ['products', 'posts']), products when none. */
export function searchTypes(value) {
  const list = String(Array.isArray(value) ? value.join(',') : value || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => SEARCH_TYPES.includes(s))
  return list.length ? [...new Set(list)] : ['products']
}

let categoriesCache = null

/** Every product category (loaded once per visit), for matching by name. */
async function allCategories(signal) {
  if (!categoriesCache) {
    categoriesCache = fetch('/wp-json/wc/store/v1/products/categories?per_page=100', { signal })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => {
        categoriesCache = null
        return []
      })
  }
  return categoriesCache
}

/** A product's address on the storefront. */
export function productPath(product) {
  const slug = String(product?.permalink || '').split('/').filter(Boolean).pop() || product?.slug || ''
  return `/product/${slug}`
}

/**
 * Results for `q`: { products, categories, posts, totals: { products, posts } }.
 * `limit` per kind. A failed kind comes back empty.
 */
export async function search(q, types, limit = 5, signal = undefined) {
  const term = String(q || '').trim().slice(0, 100)
  const out = { products: [], categories: [], posts: [], totals: { products: 0, posts: 0 } }
  if (term.length < 2) return out
  const want = searchTypes(types)
  const jobs = []
  if (want.includes('products')) {
    const qs = new URLSearchParams({ search: term, per_page: String(limit) })
    jobs.push(
      fetch(`/wp-json/wc/store/v1/products?${qs}`, { signal })
        .then(async (r) => {
          if (!r.ok) return
          out.products = (await r.json()) || []
          out.totals.products = parseInt(r.headers.get('X-WP-Total') || '0', 10) || out.products.length
        })
        .catch(() => {}),
    )
  }
  if (want.includes('categories')) {
    jobs.push(
      allCategories(signal).then((list) => {
        const lower = term.toLocaleLowerCase()
        out.categories = (Array.isArray(list) ? list : [])
          .filter((c) => c && c.slug !== 'uncategorized' && String(c.name || '').toLocaleLowerCase().includes(lower))
          .slice(0, limit)
      }),
    )
  }
  if (want.includes('posts')) {
    jobs.push(
      fetchBlogList({ search: term, perPage: limit }, '', { signal })
        .then((res) => {
          out.posts = res?.posts || []
          out.totals.posts = res?.total || out.posts.length
        })
        .catch(() => {}),
    )
  }
  await Promise.all(jobs)
  return out
}
