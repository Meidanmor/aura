// src/composables/useSeo.js
import { ref, useSSRContext } from 'vue'
import { useMeta } from 'quasar'
import { localPath, stripLang } from 'src/i18n/lang.js'
import { storeDescription, storeName } from 'src/utils/site-info.js'

// Pages with nothing for search engines (cart, checkout, account…).
const NOINDEX = 'noindex, nofollow'

/**
 * Wires backend SEO data (qwoo/v1/seo) into useMeta consistently across SSR
 * and CSR. Reads synchronously at creation time (not onMounted) to avoid a
 * flash back to empty meta right after hydration.
 *
 * { noindex: true } keeps a private page out of search engines.
 * Returns { seoData }: set seoData.value after a client-side navigation to
 * update the tags.
 */
export function useSeoMeta({ noindex = false } = {}) {
  const seoData = ref(
      process.env.CLIENT && window.__SEO_DATA__ ? window.__SEO_DATA__ : null
  )

  if (process.env.SERVER) {
    const ssr = useSSRContext()
    seoData.value = ssr?.seoData || null
  }

  useMeta(() => {
    const seo = seoData.value
    // A private page never takes another page's tags (window.__SEO_DATA__
    // still holds the page the visit started on).
    if (noindex) {
      return { title: storeName(), meta: { robots: { name: 'robots', content: NOINDEX, key: 'robots' } }, link: {} }
    }
    if (!seo) return {}

    const title = seo.title || storeName()
    const description = seo.description || storeDescription()
    // Never the address with its query (filters, sorting, tracking): that's a duplicate of the page.
    const canonical = seo.canonical || (process.env.CLIENT ? window.location.origin + window.location.pathname : '')

    const meta = {
      robots: { name: 'robots', content: seo.robots || 'index, follow', key: 'robots' },
      ogTitle: { property: 'og:title', content: title, key: 'og:title' },
      ogType: { property: 'og:type', content: seo.og_type || 'website', key: 'og:type' },
      ogSiteName: { property: 'og:site_name', content: seo.site_name || storeName(), key: 'og:site_name' },
      twitterCard: { name: 'twitter:card', content: seo.og_image ? 'summary_large_image' : 'summary', key: 'twitter:card' },
    }
    // No description at all beats an empty one: search engines then pick text from the page.
    if (description) {
      meta.description = { name: 'description', content: description, key: 'description' }
      meta.ogDescription = { property: 'og:description', content: description, key: 'og:description' }
    }
    if (canonical) meta.ogUrl ={ property: 'og:url', content: canonical, key: 'og:url' }
    if (seo.og_image) meta.ogImage = { property: 'og:image', content: seo.og_image, key: 'og:image' }
    if (seo.locale) meta.ogLocale = { property: 'og:locale', content: seo.locale, key: 'og:locale' }
    if (seo.google_verification) {
      meta.googleVerification = { name: 'google-site-verification', content: seo.google_verification, key: 'google-site-verification' }
    }

    return {
      title,
      meta,
      link: canonical ? { canonical: { rel: 'canonical', href: canonical } } : {},
    }
  })

  return { seoData }
}

export async function fetchSeoForPath(path, origin='') {
  const API_BASE = origin

  // Define default fallbacks
  const result = {
    title: storeName(),
    description: storeDescription(),
    robots: 'index, follow, max-image-preview:large',
    canonical: '',
    og_image: '',
    og_type: 'website'
  }

  try {
    // The store knows addresses without the language prefix (it answers in the page's language).
    const res = await fetch(
        `${API_BASE}/wp-json/qwoo/v1/seo?path=${encodeURIComponent(stripLang(path))}`
    )

    // Nothing at this address: say so, so the page can answer 404.
    if (res.status === 404) return { ...result, robots: NOINDEX, not_found: true }
    if (!res.ok) return result

    // Use the Spread operator (...) to merge the API data
    // into your result object. This keeps all new fields!
    const answer = { ...result, ...(await res.json()) }
    // A moved page's new address, in this language.
    if (typeof answer.redirect === 'string') answer.redirect = localPath(answer.redirect)
    return answer

  } catch (err) {
    console.error('[fetchSeoForPath] fetch error', err)
    return result
  }
}
