/**
 * The signed-in shopper's gift cards (the store's /qwoo/v1/my-giftcards):
 * cards sent to them and cards they bought. Loaded once per account, in the
 * browser only; My account shows "Gift cards" when there are any.
 */
import { computed, reactive, watch } from 'vue'
import { fetchWithToken } from 'src/composables/useApiFetch.js'
import { useAccount } from 'src/composables/useAccount.js'

const state = reactive({ forUser: 0, loading: false, received: [], bought: [], failed: false })

async function load(userId) {
  if (typeof window === 'undefined' || !userId || state.loading || state.forUser === userId) return
  state.loading = true
  state.failed = false
  try {
    const res = await fetchWithToken('/wp-json/qwoo/v1/my-giftcards')
    const data = res.ok ? await res.json() : null
    state.received = data?.received || []
    state.bought = data?.bought || []
    state.failed = !data
    state.forUser = userId
  } catch {
    state.failed = true
  } finally {
    state.loading = false
  }
}

export function useMyGiftCards() {
  const { user } = useAccount()
  watch(() => user.value?.id, (id) => {
    if (!id) Object.assign(state, { forUser: 0, received: [], bought: [] })
    else load(id)
  }, { immediate: true })
  return {
    state,
    hasAny: computed(() => state.received.length > 0 || state.bought.length > 0),
    reload: () => { state.forUser = 0; return load(user.value?.id) },
  }
}
