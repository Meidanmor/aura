/**
 * The signed-in shopper's bookings (the store's /qwoo/v1/appointments/mine).
 * Loaded once per account, in the browser only; My account shows
 * "Appointments" when there are any.
 */
import { computed, reactive, watch } from 'vue'
import { bookingApi } from 'src/composables/useBooking.js'
import { useAccount } from 'src/composables/useAccount.js'

const state = reactive({ forUser: 0, loading: false, list: [], failed: false })

async function load(userId) {
  if (typeof window === 'undefined' || !userId || state.loading || state.forUser === userId) return
  state.loading = true
  state.failed = false
  const res = await bookingApi.mine()
  state.list = res.ok && Array.isArray(res.data?.bookings) ? res.data.bookings : []
  state.failed = !res.ok
  state.forUser = userId
  state.loading = false
}

export function useMyBookings() {
  const { user } = useAccount()
  watch(() => user.value?.id, (id) => {
    if (!id) Object.assign(state, { forUser: 0, list: [] })
    else load(id)
  }, { immediate: true })
  return {
    state,
    hasAny: computed(() => state.list.length > 0),
    reload: () => { state.forUser = 0; return load(user.value?.id) },
  }
}
