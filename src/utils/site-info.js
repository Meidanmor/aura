/**
 * The store's name and description (config/pwa.json): from the published
 * version the server runs with (src-ssr/site-content.js; the browser gets it
 * in window.__QWOO_SITE__), else the one built in.
 */
function live() {
  return typeof window === 'undefined' ? globalThis.__QWOO_SITE : window.__QWOO_SITE__
}

export const storeName = () => live()?.name || process.env.STORE_NAME || ''
export const storeDescription = () => live()?.description || process.env.STORE_DESCRIPTION || ''
