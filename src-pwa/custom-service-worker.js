/*
 * This file (your custom service worker)
 * is picked up by the build system ONLY if
 * quasar.config file > pwa > workboxMode is set to "InjectManifest"
 */

import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { enable as enableNavigationPreload } from 'workbox-navigation-preload';
import { slimConfig } from '../src/utils/slim-config.js'

enableNavigationPreload();
self.skipWaiting()
clientsClaim()

// The client build (JS, CSS, fonts, the offline page) is precached. The
// published JSON (public/config/*.json, public/data/*.json) is not: it has
// its own route below, so a change shows up as soon as it's deployed.
const PRECACHE_MANIFEST = self.__WB_MANIFEST
precacheAndRoute(PRECACHE_MANIFEST)
cleanupOutdatedCaches()

// url -> revision for published JSON that is precached (none since the JSON
// has its own route; kept so older app code that asks still gets an answer).
const JSON_REVISIONS = Object.fromEntries(
  PRECACHE_MANIFEST
    .filter(entry => typeof entry === 'object' && entry.revision)
    .map(entry => ['/' + entry.url.replace(/^\.?\//, ''), entry.revision])
    .filter(([url]) => /^\/(config|data)\/[^/]+\.json$/.test(url))
)

// ─── Published JSON: fresh when online, cached for offline ───────────────────
// Network first with a short timeout; the copy in the cache answers when
// offline or slow (and the network answer still updates the cache). When a
// file changed, the open pages are told (JSON_UPDATED, so on-screen header,
// footer and page content refresh in place) and the worker checks for a new
// version of itself, since changed JSON means a new deploy.
const PUBLISHED_JSON_CACHE = 'published-json-v1'
const PUBLISHED_JSON = /^\/(config|data)\/(?:[a-z]{2,3}(?:-[a-z0-9]+)?\/)?[^/]+\.json$/i
const PUBLISHED_JSON_TIMEOUT_MS = 3000

async function refreshPublishedJson(path) {
  const cache = await caches.open(PUBLISHED_JSON_CACHE)
  const response = await fetch(path, { cache: 'no-store', credentials: 'same-origin' })
  if (!response.ok) return response
  const body = await response.clone().text()
  const cached = await cache.match(path)
  const before = cached ? await cached.text() : null
  if (before !== body) {
    await cache.put(path, response.clone())
    if (before !== null) {
      const windows = await self.clients.matchAll({ type: 'window' })
      windows.forEach(client => client.postMessage({ type: 'JSON_UPDATED', urls: [path] }))
      self.registration.update().catch(() => {})
      revalidatePublishedJson() // a deploy usually changes more than one file
    }
  }
  return response
}

// Rechecks every saved JSON file (each change is announced as above). The
// app asks for this on page changes and when the tab comes back into view,
// since the header, footer and branding stay on screen without refetching.
let sweeping = null
function revalidatePublishedJson() {
  if (!sweeping) {
    sweeping = (async () => {
      const cache = await caches.open(PUBLISHED_JSON_CACHE)
      const requests = await cache.keys()
      await Promise.all(requests.map(request => refreshPublishedJson(new URL(request.url).pathname).catch(() => {})))
    })().finally(() => { sweeping = null })
  }
  return sweeping
}

self.addEventListener('message', event => {
  if (event.data?.type === 'REVALIDATE_JSON') event.waitUntil(Promise.all([revalidatePublishedJson(), saveForOffline()]))
})

// ─── Every published page, kept for offline ──────────────────────────────────
// A store that publishes on itself (site-content.js) has one download with all
// its configs per version (/__site/m/{version}, kept by the CDN for good). Once
// per new version it goes into the cache above, so offline every page opens
// with the latest content, not only the pages visited before. Configs are
// slimmed the same way the server does, so the text matches its answers and
// nothing is announced as changed. Older stores answer { version: null }.
const OFFLINE_META_CACHE = 'offline-meta-v1'
const SAVED_VERSION_KEY = '/__qwoo-offline/version'
const VERSION_RE = /^[a-f0-9]{20,40}$/
let saving = null
let savedAt = 0

function saveForOffline() {
  if (saving || Date.now() - savedAt < 60 * 1000) return saving || Promise.resolve()
  saving = (async () => {
    const current = await fetch('/__site/current', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null))
    const version = current?.version
    if (!VERSION_RE.test(version || '')) return
    const meta = await caches.open(OFFLINE_META_CACHE)
    const saved = await meta.match(SAVED_VERSION_KEY)
    if (saved && (await saved.text()) === version) return
    const data = await fetch(`/__site/m/${version}`).then(r => (r.ok ? r.json() : null))
    if (data?.version !== version || !data.json || typeof data.json !== 'object') return
    const cache = await caches.open(PUBLISHED_JSON_CACHE)
    const json = { 'Content-Type': 'application/json; charset=utf-8' }
    await Promise.all(Object.entries(data.json).map(([key, value]) => {
      if (!PUBLISHED_JSON.test('/' + key)) return null
      const body = JSON.stringify(key.startsWith('config/') ? slimConfig(value) : value)
      return cache.put('/' + key, new Response(body, { headers: json }))
    }))
    // Published JSON that isn't inline (the products backup and such): fetched once.
    const others = Object.keys(data.files || {}).filter(key => PUBLISHED_JSON.test('/' + key) && !(key in data.json))
    await Promise.all(others.map(key => refreshPublishedJson('/' + key).catch(() => {})))
    await meta.put(SAVED_VERSION_KEY, new Response(version))
  })()
    .catch(() => {})
    .finally(() => {
      saving = null
      savedAt = Date.now()
    })
  return saving
}

registerRoute(
  ({ url }) => url.origin === self.location.origin && PUBLISHED_JSON.test(url.pathname),
  async ({ url, event }) => {
    const path = url.pathname // one copy per file, whatever the query string
    const network = refreshPublishedJson(path)
    event.waitUntil(network.catch(() => {}))
    const cached = await caches.open(PUBLISHED_JSON_CACHE).then(cache => cache.match(path))
    if (!cached) return network
    // Prefer the network, but don't keep the page waiting when it's slow.
    const timeout = new Promise(resolve => setTimeout(() => resolve(null), PUBLISHED_JSON_TIMEOUT_MS))
    try {
      const fresh = await Promise.race([network, timeout])
      return fresh && fresh.ok ? fresh : cached
    } catch {
      return cached
    }
  }
)

// Runtime caches from older versions that are no longer used.
// ssr-pages-v1: pages saved as the server drew them, which showed old content offline.
const LEGACY_CACHES = ['static-data-v1', 'page-config-v1', 'ssr-pages-v1']

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all(LEGACY_CACHES.map(name => caches.delete(name)))
    // Take control first, so a page that re-fetches its config on this
    // message is already served by this worker.
    await self.clients.claim()
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    windows.forEach(client => client.postMessage({ type: 'SW_ACTIVATED', revisions: JSON_REVISIONS }))
    await saveForOffline()
  })())
})

self.addEventListener('message', event => {
  if (event.data?.type !== 'GET_JSON_REVISIONS') return
  event.source?.postMessage({ type: 'JSON_REVISIONS', revisions: JSON_REVISIONS })
})

// ─── WooCommerce API: products & categories ───────────────────────────────────
registerRoute(
  ({ url }) =>
    (
      url.pathname === '/wp-json/wc/store/v1/products/categories' ||
      (url.pathname === '/wp-json/wc/store/v1/products' && url.searchParams.has('per_page'))
    ),
  new NetworkFirst({
    cacheName: 'woocommerce-api-v2.0',
    // Ask the server every time: browsers may still hold week-old copies
    // from when the backend sent a 7-day public Cache-Control.
    fetchOptions: { cache: 'no-cache' },
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 })
    ]
  })
);

registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'product-images-v2',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30
      })
    ]
  })
)

// Everything else about products, categories, posts and reviews: from the
// server, the last answer kept for offline (no timeout: online it always waits
// for the server, so nothing old shows while there's a connection).
registerRoute(
  ({ url, request }) => url.origin === self.location.origin && request.method === 'GET' && (
    url.pathname.startsWith('/wp-json/wc/store/v1/products') ||
    /^\/wp-json\/qwoo\/v1\/(blog|reviews|products-meta|payment-config)(\/|$)/.test(url.pathname)
  ),
  new NetworkFirst({
    cacheName: 'store-reads-v1',
    fetchOptions: { cache: 'no-cache' },
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 })
    ]
  })
);

// ─── SEO API ──────────────────────────────────────────────────────────────────
registerRoute(
  ({ url }) =>
    url.pathname === '/wp-json/qwoo/v1/seo' &&
    url.searchParams.has('path'),
  new NetworkFirst({
    cacheName: 'seo-api-v2.0',
    fetchOptions: { cache: 'no-cache' },
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 })
    ]
  })
);

// ─── Every other API read: always from the server ────────────────────────────
// (price range, single product, payment config…). Skips any week-old copy the
// browser kept from the backend's old Cache-Control.
registerRoute(
  ({ url, request }) => url.origin === self.location.origin && url.pathname.startsWith('/wp-json/') && request.method === 'GET',
  new NetworkOnly({ fetchOptions: { cache: 'no-cache' } })
);

self.addEventListener('message', async (event) => {
    if (event.data?.type !== 'UPDATE_SW') return;

    try {
        await self.registration.update();
    } catch (err) {
        console.warn('[SW] update check failed', err);
    }
});

// ─── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    console.error('Push data parse error', e);
  }

  const notification = data.notification || data;

  const options = {
    body: notification.body,
    icon: notification.icon || '/icons/favicon-128x128.png',
    badge: notification.badge || '/icons/favicon-96x96.png',
    data: notification.data || {},
    tag: notification.tag || 'default',
    requireInteraction: notification.requireInteraction ?? true,
    renotify: notification.renotify ?? true,
    vibrate: notification.vibrate || ''
  };

  event.waitUntil(
    self.registration.showNotification(notification.title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const clickUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.postMessage({ action: 'navigate', url: clickUrl });
          return client.focus();
        }
      }
      return clients.openWindow(clickUrl);
    })
  );
});

// ─── Navigation: the server's page, else the app drawn from saved files ──────
// Offline, every address opens the app shell (offline.html, precached), which
// draws the page in the browser from the saved configs and API answers above:
// the latest saved content for any page, not an old copy of one page.
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event }) => {
    try {
      const preloadResponse = await event.preloadResponse
      return preloadResponse || await fetch(event.request)
    } catch {
      const shell = await matchPrecache('offline.html')
      return shell || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    }
  }
)

// service-worker.js
let isOnline = true;

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only check connectivity on external/API requests, ignore same-origin
  const isExternalRequest = url.origin !== self.location.origin;

  if (!isExternalRequest) {
    return; // let the browser handle it normally, don't use it for connectivity
  }

  event.respondWith(
    fetch(event.request).then(response => {
      if (!isOnline) {
        isOnline = true;
        self.clients.matchAll().then(clients =>
          clients.forEach(c => c.postMessage({ type: 'ONLINE' }))
        );
      }
      return response;
    }).catch(err => {
      if (isOnline) {
        isOnline = false;
        self.clients.matchAll().then(clients =>
          clients.forEach(c => c.postMessage({ type: 'OFFLINE' }))
        );
      }
      throw err;
    })
  );
});
