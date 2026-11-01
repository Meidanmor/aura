// useSavedAddresses.js
// The signed-in customer's saved addresses (store: qwoo/v1/addresses), shared by
// My account → Account details and the checkout's "Use saved address".
// Loaded once per customer; changes answer with the whole new list.

import { reactive } from 'vue'
import { fetchWithToken } from 'src/composables/useApiFetch.js'
import { userState } from 'src/stores/user.js'

export const ADDRESS_FIELDS = ['label', 'first_name', 'last_name', 'phone', 'address_1', 'city', 'postcode', 'country']

const state = reactive({ list: [], loaded: false, loading: false, user: 0 })
let pending = null

function forUser() {
  const id = userState.data?.id || 0
  if (state.user !== id) {
    state.user = id
    state.list = []
    state.loaded = false
    pending = null
  }
  return id
}

/** Loads the list once for this customer (again with `force`). Nothing for guests. */
export async function loadAddresses(force = false) {
  if (typeof window === 'undefined' || !forUser()) return []
  if (state.loaded && !force) return state.list
  if (pending) return pending
  state.loading = true
  pending = (async () => {
    try {
      const res = await fetchWithToken('/wp-json/qwoo/v1/addresses')
      if (res.ok) {
        const data = await res.json()
        state.list = Array.isArray(data.addresses) ? data.addresses : []
        state.loaded = true
      }
    } catch (err) {
      console.warn('Saved addresses failed to load:', err)
    } finally {
      state.loading = false
      pending = null
    }
    return state.list
  })()
  return pending
}

/** Adds an address (or changes it, with `id`). Throws with the store's message. */
export async function saveAddress(address) {
  const body = {}
  for (const k of ['id', ...ADDRESS_FIELDS]) if (address[k] != null) body[k] = String(address[k])
  const res = await fetchWithToken('/wp-json/qwoo/v1/addresses', { method: 'POST', body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.success) throw new Error(data.message || 'We couldn\'t save the address. Please try again.')
  state.list = data.addresses || state.list
  state.loaded = true
  return data.address
}

export async function deleteAddress(id) {
  const res = await fetchWithToken(`/wp-json/qwoo/v1/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.success) throw new Error(data.message || 'We couldn\'t delete the address. Please try again.')
  state.list = data.addresses || []
}

const norm = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase()

/** Is this recipient + place already saved? (Letter case and spaces don't count.) */
export function isSaved(address) {
  return state.list.some((a) => ['first_name', 'last_name', 'phone', 'address_1', 'city', 'postcode', 'country']
    .every((k) => norm(a[k]) === norm(address[k])))
}

/** "Dana Levi" */
export const addressName = (a) => [a.first_name, a.last_name].filter(Boolean).join(' ')
/** "Herzl 1, Tel Aviv 6100000" */
export const addressLine = (a) => [a.address_1, [a.city, a.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ')

export function useSavedAddresses() {
  forUser()
  return state
}
