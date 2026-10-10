/**
 * Which language a page is in. The main language lives at the store's own
 * addresses (/product/mug); each extra language (premium addon) at the same
 * addresses behind its prefix (/en/product/mug). Addresses are never
 * translated. The languages and prefixes come from config/languages.json
 * (the published version, see storeLanguages()).
 *
 * The language of the page being rendered:
 *   - on the server, per request: src-ssr/middlewares/render.js runs each
 *     render inside an AsyncLocalStorage store ({ lang, i18n }), shared here
 *     through globalThis.__QWOO_LANG_ALS;
 *   - in the browser, from the address the visit started on. Moving to
 *     another language reloads the page (router guard), so it never changes
 *     while the app runs.
 */
import { storeLanguages } from './index.js'

const isServer = typeof window === 'undefined'

export const mainLang = () => storeLanguages().main
export const extraLangs = () => storeLanguages().extra
export const allLangs = () => [storeLanguages().main, ...storeLanguages().extra]
export const isExtraLang = (code) => !!code && code !== storeLanguages().main && storeLanguages().extra.includes(code)

/** The address prefix of a language ('' for the main language). */
export const prefixOf = (code) => (isExtraLang(code) ? String(storeLanguages().prefixes?.[code] || code) : '')

/** The language an address belongs to ('/en/cart' → 'en', '/cart' → the main language). */
export function langFromPath(path) {
  const first = String(path || '/').split(/[?#]/)[0].split('/').filter(Boolean)[0] || ''
  let segment = first
  try {
    segment = decodeURIComponent(first)
  } catch {
    // keep it as it is
  }
  const { main, extra } = storeLanguages()
  return extra.find((code) => prefixOf(code) === segment) || main
}

/** The address without its language prefix ('/en/cart' → '/cart', 'en/cart' → 'cart'). */
export function stripLang(path) {
  const s = String(path ?? '')
  const code = langFromPath(s.startsWith('/') ? s : `/${s}`)
  if (!isExtraLang(code)) return s
  const lead = s.startsWith('/') ? '/' : ''
  const rest = s.replace(/^\/?[^/?#]+/, '')
  return lead ? rest || '/' : rest.replace(/^\//, '')
}

/** An address of the main language in another language ('/cart', 'en' → '/en/cart'). */
export function withLang(path, code) {
  const s = String(path ?? '/')
  if (!s.startsWith('/') || s.startsWith('//')) return s
  const bare = stripLang(s)
  const prefix = prefixOf(code)
  if (!prefix) return bare
  return bare === '/' ? `/${prefix}` : `/${prefix}${bare.startsWith('/') ? '' : '/'}${bare}`
}

let clientLang = null

/** The language of the page being rendered. */
export function currentLang() {
  if (isServer) return globalThis.__QWOO_LANG_ALS?.getStore()?.lang || mainLang()
  if (clientLang === null) clientLang = langFromPath(window.location.pathname)
  return clientLang
}

/** The current page's address in the current language (adds its prefix to a main-language path). */
export const localPath = (path) => withLang(path, currentLang())
