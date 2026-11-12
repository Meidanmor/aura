/**
 * The signed-in shopper's conversations with the store (the store's
 * /qwoo/v1/inbox/mine). Loaded once per account, in the browser only;
 * My account shows "Messages" when there are any.
 */
import { computed, reactive, watch } from 'vue'
import { loadMine } from 'src/composables/useHelp.js'
import { useAccount } from 'src/composables/useAccount.js'

const state = reactive({ forUser: 0, loading: false, list: [], failed: false })

async function load(userId) {
  if (typeof window === 'undefined' || !userId || state.loading || state.forUser === userId) return
  state.loading = true
  state.failed = false
  const data = await loadMine()
  state.list = Array.isArray(data?.conversations) ? data.conversations : []
  state.failed = !data
  state.forUser = userId
  state.loading = false
}

export function useMyMessages() {
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
