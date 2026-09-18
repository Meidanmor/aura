const EDITOR_FLAG_PARAM = 'qwoo_editor'
const EDITOR_ORIGIN_PARAM = 'admin_origin'

export function isEditorMode() {
  // postMessage/window only exist client-side — SSR never treats a request
  // as editor mode, it just renders the normal preview/published content.
  if (import.meta.env.SSR) return false
  return new URLSearchParams(window.location.search).get(EDITOR_FLAG_PARAM) === '1'
}

function getTrustedAdminOrigin() {
  if (import.meta.env.SSR) return null
  const raw = new URLSearchParams(window.location.search).get(EDITOR_ORIGIN_PARAM)
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch (err) {
    console.warn(err)
    return null
  }
}

/**
 * Subscribes to live (unsaved) draft updates pushed from Shop Builder's
 * Live Preview panel. No-op outside editor mode or on the server.
 * `callback` receives just this page's slice (e.g. `payload.home`,
 * `payload.shop`) — call this once per page component, typically in
 * onMounted(), alongside your existing loadPageConfig() call.
 * Returns an unsubscribe function — call it in onUnmounted().
 */
export function subscribeToLiveConfig(page, callback) {
  if (!isEditorMode()) return () => {}

  const trustedOrigin = getTrustedAdminOrigin()
  if (!trustedOrigin) {
    console.warn('[loadPageConfig] qwoo_editor=1 present but admin_origin missing/invalid — live sync disabled.')
    return () => {}
  }

  const handler = (event) => {
    if (event.origin !== trustedOrigin) return
    const data = event.data
    if (!data || data.source !== 'qwoo-admin' || data.type !== 'state') return

    const pageData = data.payload ? data.payload[page] : undefined
    console.log(pageData)

    if (pageData !== undefined) callback(pageData)
  }

  window.addEventListener('message', handler)

  // Handshake — tells the admin panel to (re)send state right now instead
  // of waiting for the next field edit.
  window.parent.postMessage({ source: 'qwoo-frontend', type: 'ready' }, trustedOrigin)

  return () => window.removeEventListener('message', handler)
}

export async function loadPageConfig(page, isPreview, origin='') {
  const API_BASE = origin

  // Editor mode, client-side: skip the fetch entirely. The calling
  // component is expected to also call subscribeToLiveConfig(page, ...) to
  // get data via postMessage instead. SSR still falls through to the
  // normal preview fetch below (postMessage doesn't exist server-side), so
  // the iframe has real content on first paint before the client bridge
  // takes over.
  if (!import.meta.env.SSR && isEditorMode()) {
    return {}
  }

  // --- SERVER SIDE LOGIC ---
if (import.meta.env.SSR) {
  try {
    // 1. If Preview, fetch from WordPress API
    if (isPreview) {
      const url = `${API_BASE}/wp-json/shop-builder/v1/preview/${page}`;

      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return await response.json();
      throw new Error(`WP API responded with ${response.status}`);
    }

    // 2. If NOT Preview — use filesystem in dev, HTTP fetch in production
    if (import.meta.env.DEV) {
      const { readFile } = await import('fs/promises')
      const { resolve } = await import('path')

      const filePath = resolve(process.cwd(), 'public', 'config', `${page}.json`)

      const raw = await readFile(filePath, 'utf-8')
      return JSON.parse(raw)
    } else {
      const url = `${API_BASE}/config/${page}.json`

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
      const url = isPreview
        ? `${API_BASE}/wp-json/shop-builder/v1/preview/${page}`
        : `/config/${page}.json`;

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