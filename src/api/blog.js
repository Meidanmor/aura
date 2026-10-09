// The store's blog (qwoo/v1/blog), read live like products.
// origin: the storefront's own address during SSR (its /wp-json proxy), '' in the browser.

/** { posts, page, pages, total, categories, category } or null when the category doesn't exist. */
export async function fetchBlogList({ page = 1, category = '', perPage = 9 } = {}, origin = '') {
  const q = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (category) q.set('category', category)
  const res = await fetch(`${origin}/wp-json/qwoo/v1/blog?${q}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('The blog could not be loaded.')
  return res.json()
}

/** One post, or null when there's none at this address. */
export async function fetchBlogPost(slug, origin = '') {
  const res = await fetch(`${origin}/wp-json/qwoo/v1/blog/post?slug=${encodeURIComponent(slug)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('The post could not be loaded.')
  return res.json()
}

/**
 * "9 Oct 2026": the post's day in the store's time zone (day: YYYY-MM-DD),
 * in a fixed language, so the server's page and the browser's match (a
 * different text would break hydration).
 */
export function postDate(seconds, day = '') {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T12:00:00Z`) : new Date(seconds * 1000)
  return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}
