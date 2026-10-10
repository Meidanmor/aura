import { defineRouter } from '#q-app/wrappers'
import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import routes from './routes'
import { initSwUpdates } from 'src/services/sw-updates'
import { isEditorMode } from 'src/utils/config-loader'
import { currentLang, isExtraLang, langFromPath, withLang } from 'src/i18n/lang.js'

/**
 * On a page of an extra language, every link and navigation stays in it:
 * '/cart' becomes '/en/cart', and { name: 'products' } the language's own
 * 'products@en'. Addresses that already name a language are left alone (the
 * language switcher).
 */
function localize(router, to) {
  const lang = currentLang()
  if (!isExtraLang(lang)) return to
  const local = (path) => (typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && langFromPath(path) !== lang && !path.startsWith('/auth/') ? withLang(path, lang) : path)
  if (typeof to === 'string') return local(to)
  if (!to || typeof to !== 'object') return to
  if (typeof to.name === 'string' && !to.name.includes('@') && router.hasRoute(`${to.name}@${lang}`)) return { ...to, name: `${to.name}@${lang}` }
  if (typeof to.path === 'string') return { ...to, path: local(to.path) }
  return to
}

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory)

  const Router = createRouter({
    scrollBehavior: (to, from, savedPosition) => {
      // 1. If user clicked "Back" or "Forward", restore exactly where they were
      if (savedPosition) {
        return savedPosition
      }

      // 2. If we are navigating to the EXACT same path (e.g., just changing a query ?color=red)
      // do not scroll to the top.
      if (to.path === from.path) {
        return false
      }

      // 3. For all other navigations (new links), scroll to top smoothly
      // We use a Promise with a tiny timeout to ensure the new content
      // has started rendering before we move the scrollbar.
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ left: 0, top: 0, behavior: 'smooth' })
        }, 10) // 50ms is usually enough to let Vue swap the component content
      })
    },
    routes: routes(),
    history: createHistory(process.env.VUE_ROUTER_BASE)
  })

  // Links (RouterLink resolves) and navigations keep the page's language.
  for (const method of ['resolve', 'push', 'replace']) {
    const original = Router[method].bind(Router)
    Router[method] = (to, ...rest) => original(localize(Router, to), ...rest)
  }

  // Another language is another app (its own texts and store answers): load it fresh.
  if (process.env.CLIENT) {
    Router.beforeEach((to, from) => {
      const lang = to.meta?.lang || langFromPath(to.path)
      if (from.matched.length && lang !== currentLang()) {
        window.location.assign(to.fullPath)
        return false
      }
    })
  }

  // --- Start Preview Lock Logic ---
  Router.beforeEach((to, from, next) => {
    // Shop Builder's Live Preview iframe (?qwoo_editor=1) shows one page;
    // clicking around inside it would drop the editor params.
    const isPreview = to.query.qwoo_editor === '1' || from.query.qwoo_editor === '1';

    if (isPreview) {
      // Allow the initial load (when there is no 'from' name or path is just root)
      if (!from.name && from.fullPath === '/') {
        return next();
      }

      // Block all other manual clicks/navigation inside the iframe
      console.warn('Navigation blocked: Iframe is in Preview Mode');
      return next(false);
    }

    next();
  });
  // --- End Preview Lock Logic ---

  // Pick up a newer service worker (and its updated JSON) before route
  // changes. Not in the Shop Builder iframe, which gets data via postMessage.
  if (process.env.CLIENT && !isEditorMode()) initSwUpdates(Router)

  return Router
})