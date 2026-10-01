/*
 * This file (your custom service worker)
 * is picked up by the build system ONLY if
 * quasar.config file > pwa > workboxMode is set to "InjectManifest"
 */

import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { enable as enableNavigationPreload } from 'workbox-navigation-preload';

enableNavigationPreload();
self.skipWaiting()
clientsClaim()

// Everything in the client build is precached, including the published
// JSON files (public/config/*.json, public/data/*.json). Each entry carries a
// content revision, so when the plugin pushes new JSON and the app is rebuilt,
// this file changes, the browser installs the new worker, and only the files
// whose revision changed are downloaded again. The app checks for that new
// worker before route changes (src/services/sw-updates.js), so navigation
// doesn't keep showing JSON from an older build.
const PRECACHE_MANIFEST = self.__WB_MANIFEST
precacheAndRoute(PRECACHE_MANIFEST)
cleanupOutdatedCaches()

// url -> revision for the published JSON files in this build. Sent to the
// app so it can tell exactly which config files changed between versions.
const JSON_REVISIONS = Object.fromEntries(
  PRECACHE_MANIFEST
    .filter(entry => typeof entry === 'object' && entry.revision)
    .map(entry => ['/' + entry.url.replace(/^\.?\//, ''), entry.revision])
    .filter(([url]) => /^\/(config|data)\/[^/]+\.json$/.test(url))
)

// Runtime caches from older versions that are no longer used (the JSON
// files are served from the precache).
const LEGACY_CACHES = ['static-data-v1', 'page-config-v1']

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all(LEGACY_CACHES.map(name => caches.delete(name)))
    // Take control first, so a page that re-fetches its config on this
    // message is already served by this worker.
    await self.clients.claim()
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    windows.forEach(client => client.postMessage({ type: 'SW_ACTIVATED', revisions: JSON_REVISIONS }))
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

// ─── SEO API ──────────────────────────────────────────────────────────────────
registerRoute(
  ({ url }) =>
    url.pathname === '/wp-json/qwoo/v1/seo' &&
    url.searchParams.has('path'),
  new NetworkFirst({
    cacheName: 'seo-api-v2.0',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 })
    ]
  })
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

// ─── Navigation: Offline-first SSR pages ─────────────────────────────────────
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event }) => {
    const url = new URL(event.request.url)

    try {
      const preloadResponse = await event.preloadResponse
      const networkResponse = preloadResponse || await fetch(event.request)

      if (networkResponse.ok &&
          networkResponse.headers.get('content-type')?.includes('text/html')) {
        const cache = await caches.open('ssr-pages-v1')
        event.waitUntil(cache.put(url.pathname, networkResponse.clone()))
      }

      return networkResponse

    } catch (err) {
      console.warn('[SW] Navigation offline fallback for', url.pathname, err)  // log the error

      const cache = await caches.open('ssr-pages-v1')
      const cachedPage =
        await cache.match(url.pathname) ||
        await cache.match('/') ||
        await cache.match('/index.html')

      if (cachedPage) return cachedPage

      return new Response('Offline', { status: 503 })
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
