import { onMounted, onServerPrefetch, useSSRContext, watch } from 'vue'
import { useSectionData } from 'src/composables/useSectionData.js'

/**
 * Data for a Shop Builder block that has to fetch something (products,
 * categories, ...):
 *   - resolved during SSR and handed to the client through
 *     useSectionData()'s per-block bucket, so hydration reuses it;
 *   - fetched on mount if SSR didn't provide it;
 *   - re-fetched whenever `getKey()` changes (e.g. the admin edits the query
 *     in the live preview).
 *
 * `resolver(ssrContext)` returns the data; `blockId` keys the SSR bucket.
 */
export function useBlockQuery(blockId, getKey, resolver) {
  const { data, resolve } = useSectionData(blockId, resolver)

  let ssrContext = null
  if (process.env.SERVER) ssrContext = useSSRContext()

  onServerPrefetch(() => resolve(ssrContext))

  onMounted(() => {
    if (data.value === null) resolve(null)
  })

  watch(getKey, (next, prev) => {
    if (next !== prev) resolve(null)
  })

  return { data }
}
