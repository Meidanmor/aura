import { loadPageConfig } from 'src/utils/config-loader'
import { resolveHeroImageSrc } from 'src/utils/resolve-hero-image'

/**
 * The page linked its header, footer and branding configs as a cached script
 * (src-ssr/shared-state.js) instead of carrying them. If that script couldn't
 * be loaded (a network error, or a server instance that hadn't caught up with
 * a publish yet), they're fetched here, before the app takes over the page,
 * the same way MainLayout's preFetch reads them.
 */
export default async () => {
  if (!document.querySelector('script[data-qwoo-shared]') || window.__HEADER_CONFIG__ !== undefined) return
  const [brand, header, footer] = await Promise.all(['branding', 'header', 'footer'].map((page) => loadPageConfig(page)))
  if (brand) brand.logo = await resolveHeroImageSrc(brand.logo, 'branding', '', brand.logo_path)
  window.__BRAND_CONFIG__ = brand || {}
  window.__HEADER_CONFIG__ = header || {}
  window.__FOOTER_CONFIG__ = footer || null
}
