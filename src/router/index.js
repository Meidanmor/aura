import { defineRouter } from '#q-app/wrappers'
import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import routes from './routes'
import { initSwUpdates } from 'src/services/sw-updates'
import { isEditorMode } from 'src/utils/config-loader'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

// Whether a drawer/dialog had the page scroll locked when the current
// navigation started (see scrollBehavior).
let navStartedScrollLocked = false

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
      //
      // Navigating from an open drawer: Quasar locks the page scroll while
      // the drawer is open and, when it unlocks, scrolls back to where the
      // page was unless location.pathname changed. In the native app the
      // router uses hash URLs, so the pathname never changes — and on iOS the
      // unlock is also delayed — so it would undo our scroll to the top. Wait
      // for the unlock (document.qScrollPrevented), then jump to the top
      // instantly: the old position was never visible behind the drawer.
      const fromLockedPage = navStartedScrollLocked
      return new Promise((resolve) => {
        const startedAt = Date.now()
        const scroll = () => {
          if (document.qScrollPrevented === true && Date.now() - startedAt < 1000) {
            setTimeout(scroll, 20)
            return
          }
          resolve({ left: 0, top: 0, behavior: fromLockedPage ? 'auto' : 'smooth' })
        }
        setTimeout(scroll, 10) // 50ms is usually enough to let Vue swap the component content
      })
    },
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE)
  })

  if (process.env.CLIENT) {
    Router.beforeEach(() => {
      navStartedScrollLocked = document.qScrollPrevented === true
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