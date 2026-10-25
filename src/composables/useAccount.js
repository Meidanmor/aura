// useAccount.js
// Who is signed in, shared by every Sign In / Sign Up form, the account blocks
// (My account) and the header's Account widget, wherever they are.
//
// The server never knows (the page is the same for everyone), so the browser
// works it out once per visit: a visitor who was never signed in is a guest at
// once; otherwise /qwoo/v1/me says. <html> gets `qa-out` or `qa-in` so the
// "Show To" setting of sections and blocks can show the right ones with CSS
// (app.css), without changing what the server rendered.

import { computed, inject, reactive } from 'vue'
import { fetchWithToken, getWasLoggedIn, setLoggedIn } from 'src/composables/useApiFetch.js'
import { clearSessionState } from 'src/composables/useSessionCleanup.js'
import { setUser, userState } from 'src/stores/user.js'
import { isEditorMode } from 'src/utils/config-loader.js'

const state = reactive({
  checked: false, // the browser knows now
  checking: false,
  // The Store builder's live preview: both kinds of "Show To" items show (outlined),
  // and the account blocks show a sample customer.
  editor: false,
})
let pending = null

function markPage() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  state.editor = isEditorMode()
  root.classList.toggle('qa-editor', state.editor)
  root.classList.toggle('qa-in', state.checked && !!userState.data?.id)
  root.classList.toggle('qa-out', state.checked && !userState.data?.id)
}

/** Once per visit: is this visitor signed in? (Browser only; later calls share the answer.) */
export function checkSession() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (state.checked) return Promise.resolve(userState.data?.id ? userState.data : null)
  if (pending) return pending
  if (!getWasLoggedIn()) {
    if (userState.data?.id) setUser(null)
    state.checked = true
    markPage()
    return Promise.resolve(null)
  }
  state.checking = true
  pending = (async () => {
    try {
      const res = await fetchWithToken('/wp-json/qwoo/v1/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setLoggedIn(true)
      } else {
        clearSessionState()
      }
    } catch (err) {
      // Offline: keep what this browser remembers.
      console.warn('Session check failed:', err)
    } finally {
      state.checking = false
      state.checked = true
      pending = null
      markPage()
    }
    return userState.data?.id ? userState.data : null
  })()
  return pending
}

/** After a sign-in or sign-up answered with the customer. */
export function signedIn(user) {
  setUser(user)
  setLoggedIn(true)
  state.checked = true
  markPage()
}

/** Signs out on the store, then forgets the customer here. Throws when the store couldn't be reached. */
export async function signOut() {
  await fetchWithToken('/wp-json/qwoo/v1/logout', { method: 'POST' })
  clearSessionState()
  state.checked = true
  markPage()
}

/**
 * The store's sign-in settings (branding.json `account`, published by the
 * store): { signup: visitors can make an account, google: Google's Client ID
 * or ''}. Older stores send none: sign-up on, the build's Google ID.
 */
export function useSiteAccount() {
  const brand = inject('brandSettings', null)
  return computed(() => {
    const a = brand?.value?.account
    return {
      signup: a ? a.signup !== false : true,
      google: (a ? a.google : import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID) || '',
    }
  })
}

// What the account blocks show in the Store builder's preview, where the owner isn't signed in as a customer.
const SAMPLE = { id: 0, first_name: 'Dana', last_name: 'Levi', email: 'dana@example.com', sample: true }

/**
 * For the My account blocks: the customer, or a sample one in the Store
 * builder's preview (`sample: true`: nothing is loaded or saved).
 */
export function useAccountView() {
  return {
    user: computed(() => (state.checked && userState.data?.id ? userState.data : state.editor ? SAMPLE : null)),
    signedIn: computed(() => (state.checked && !!userState.data?.id) || state.editor),
  }
}

/** The customer, after the session check (`null` while unknown or signed out). */
export function useAccount() {
  return {
    state,
    user: computed(() => (state.checked && userState.data?.id ? userState.data : null)),
    signedIn: computed(() => state.checked && !!userState.data?.id),
    known: computed(() => state.checked),
  }
}

// Signing in or out in another tab (user.js syncs the customer itself).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'user_session' && state.checked) markPage()
  })
}

/**
 * Where a form sends the customer afterwards: 'stay' (this page), 'account'
 * (My account) or 'page' (the owner's own address, this site only).
 * Returns the path, or '' to stay.
 */
export function afterSignInPath(d) {
  if (d?.after === 'account') return '/my-account'
  if (d?.after === 'page') {
    const url = String(d.redirect_url || '').trim()
    // Only addresses on this store: never another site (an open redirect).
    if (/^\/(?!\/)/.test(url)) return url
  }
  return ''
}
