import { computed, inject, ref } from 'vue'
import { useRouter } from 'vue-router'
import { signOut } from 'src/composables/useAccount.js'

/**
 * My account's parts: the Dashboard at /my-account, the others at their own
 * address (/my-account/orders, /my-account/details), so menus and the
 * header's Account widget can link straight to one.
 */
export const ACCOUNT_PARTS = ['dashboard', 'orders', 'details']

export const partPath = (part) => (part === 'dashboard' ? '/my-account' : `/my-account/${part}`)

/** The part an address shows ('' = not a part: Dashboard). */
export const partOf = (value) => (ACCOUNT_PARTS.includes(value) ? value : 'dashboard')

/**
 * Whether an account block shows now: on its own part (`own`, the default)
 * or on every part (`always`). Outside My account (no page bag) it always shows.
 */
export function usePartShown(data, own) {
  const accountPage = inject('accountPage', null)
  return computed(() => !accountPage || data().show_on === 'always' || accountPage.part === own)
}

/** Sign out, then back to My account (where visitors see the sign-in forms). */
export function useAccountLogout() {
  const router = useRouter()
  const busy = ref(false)
  const error = ref('')
  async function logout() {
    busy.value = true
    error.value = ''
    try {
      await signOut()
      router.push('/my-account')
    } catch (e) {
      console.error('Sign out failed:', e)
      error.value = 'Sign out failed. Please try again.'
    } finally {
      busy.value = false
    }
  }
  return { busy, error, logout }
}
