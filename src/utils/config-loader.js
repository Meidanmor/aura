import { JSON_UPDATED_EVENT } from 'src/services/sw-updates'
import { currentLang, isExtraLang } from 'src/i18n/lang.js'

// Files each extra language has its own copy of (in /config/{lang}/); the
// rest (branding, app, icons…) are shared by every language.
const OWN_COPY = /^(header|footer|home|checkout|contact|shop|category|product|cart|blog|blog_post|pages|page-[\w-]+)$/

/** Where a page's published config lives for the page's language: 'home' → 'en/home'. */
export function configName(page) {
  const lang = currentLang()
  return isExtraLang(lang) && OWN_COPY.test(page) ? `${lang}/${page}` : page
}

const EDITOR_FLAG_PARAM = 'qwoo_editor'
const EDITOR_ORIGIN_PARAM = 'admin_origin'

// The only origins allowed to drive the Live Preview: the WordPress backend
// (wp-admin) and, optionally, the store platform's owner dashboard — both
// baked in at build time (quasar.config.js build.env: WP_BACKEND_URL,
// QWOO_EDITOR_ORIGIN). The admin_origin URL param is only ever CHECKED
// against them — trusting the param itself would let any site open the
// storefront (e.g. in a popup) and push its own content into the page.
const TRUSTED_ADMIN_ORIGINS = [process.env.WP_BACKEND_ORIGIN, process.env.QWOO_EDITOR_ORIGIN]
  .map((value) => {
    try {
      return value ? new URL(value).origin : ''
    } catch {
      return ''
    }
  })
  .filter(Boolean)

function getTrustedAdminOrigin() {
  if (import.meta.env.SSR || !TRUSTED_ADMIN_ORIGINS.length) return null
  const raw = new URLSearchParams(window.location.search).get(EDITOR_ORIGIN_PARAM)
  try {
    const origin = raw ? new URL(raw).origin : ''
    return TRUSTED_ADMIN_ORIGINS.includes(origin) ? origin : null
  } catch {
    return null
  }
}

/**
 * True only inside the Shop Builder's Live Preview iframe: flagged with
 * ?qwoo_editor=1, actually framed, and the declared admin origin is our
 * WordPress backend. SSR never treats a request as editor mode — it renders
 * the published content, which the client then replaces with the draft.
 */
export function isEditorMode() {
  if (import.meta.env.SSR) return false
  if (new URLSearchParams(window.location.search).get(EDITOR_FLAG_PARAM) !== '1') return false
  if (window.parent === window) return false
  return getTrustedAdminOrigin() !== null
}

/**
 * Calls `callback` with the fresh published config when a new service worker
 * brings a changed /config/{page}.json (see src/services/sw-updates.js), so
 * a page already on screen updates without a reload. No-op on the server.
 */
export function onPublishedConfigUpdate(page, callback) {
  if (import.meta.env.SSR) return () => {}

  const handler = async (event) => {
    if (!event.detail?.pages?.includes(configName(page))) return
    const data = await loadPageConfig(page, false)
    if (data && Object.keys(data).length) callback(data)
  }

  window.addEventListener(JSON_UPDATED_EVENT, handler)
  return () => window.removeEventListener(JSON_UPDATED_EVENT, handler)
}

/**
 * Subscribes to live (unsaved) draft updates pushed from Shop Builder's
 * Live Preview panel. Outside editor mode it subscribes to published config
 * updates instead (onPublishedConfigUpdate), using `options.onPublished`
 * when given, else `callback`.
 * `callback` receives just this page's slice (e.g. `payload.home`,
 * `payload.shop`) — call this once per page component, typically in
 * onMounted(), alongside your existing loadPageConfig() call.
 * Returns an unsubscribe function — call it in onUnmounted().
 */
export function subscribeToLiveConfig(page, callback, options = {}) {
  if (!isEditorMode()) return onPublishedConfigUpdate(page, options.onPublished || callback)

  const trustedOrigin = getTrustedAdminOrigin()
  if (!trustedOrigin) {
    return () => {}
  }

  const handler = (event) => {
    // Only the wp-admin page that frames us — checked by origin AND window.
    if (event.origin !== trustedOrigin || event.source !== window.parent) return
    const data = event.data
    if (!data || data.source !== 'qwoo-admin' || data.type !== 'state') return

    const pageData = data.payload ? data.payload[page] : undefined
    if (pageData !== undefined) callback(pageData)
  }

  window.addEventListener('message', handler)

  // Handshake — tells the admin panel to (re)send state right now instead
  // of waiting for the next field edit.
  window.parent.postMessage({ source: 'qwoo-frontend', type: 'ready' }, trustedOrigin)

  return () => window.removeEventListener('message', handler)
}

/**
 * Loads a page's published config (/config/{page}.json).
 * `_isPreview` is ignored: the WP preview endpoint it used to select was
 * removed (it exposed unpublished drafts) — the Live Preview gets drafts via
 * subscribeToLiveConfig() instead. Kept so existing callers stay valid.
 */
export async function loadPageConfig(page, _isPreview, origin='') {
  // An extra language's own copy (/config/en/home.json).
  const name = configName(page)
  const data = await loadConfigFile(name, origin)
  // Not published in this language yet: the main language's file (never
  // another language's pages, which only exist once they're translated).
  if (name !== page && !Object.keys(data || {}).length && !/^(pages|page-)/.test(page)) {
    return loadConfigFile(page, origin)
  }
  return data
}

/** One published config file by name ('home', 'en/home'); {} when it can't be read. */
async function loadConfigFile(name, origin = '') {
  const API_BASE = origin

  // Editor mode, client-side: skip the fetch entirely. The calling
  // component is expected to also call subscribeToLiveConfig(page, ...) to
  // get data via postMessage instead. SSR still falls through to the
  // normal published fetch below (postMessage doesn't exist server-side), so
  // the iframe has real content on first paint before the client bridge
  // takes over.
  if (!import.meta.env.SSR && isEditorMode()) {
    return {}
  }

  // --- SERVER SIDE LOGIC ---
if (import.meta.env.SSR) {
  // The store's live version, already in memory (src-ssr/site-content.js).
  // A copy: pages change what they get (the logo's address…).
  const site = globalThis.__QWOO_SITE
  if (site) {
    const data = site.json[`config/${name}.json`]
    return data && typeof data === 'object' ? structuredClone(data) : {}
  }
  try {
    // Filesystem in dev, HTTP fetch in production
    if (import.meta.env.DEV) {
      const { readFile } = await import('fs/promises')
      const { resolve } = await import('path')

      const filePath = resolve(process.cwd(), 'public', 'config', `${name}.json`)

      const raw = await readFile(filePath, 'utf-8')
      return JSON.parse(raw)
    } else {
      const url = `${API_BASE}/config/${name}.json`

      const response = await fetch(url, { cache: 'no-store' })
      if (response.ok) return await response.json()
      throw new Error(`Config fetch responded with ${response.status}`)
    }

  } catch (err) {
    console.error('[SSR] loadPageConfig Error:', err.message);
    return {};
  }
}
// --- CLIENT SIDE LOGIC ---
  else {
    try {
      const url = `/config/${name}.json`;

      const response = await fetch(url, {
        cache: 'no-store'
      });
      if (!response.ok) return {};
      return await response.json();
    } catch (err) {
      console.error('[Client] loadPageConfig Error:', err);
      return {};
    }
  }
}