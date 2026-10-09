import { onMounted, onUnmounted, ref, useSSRContext } from 'vue'
import { subscribeToLiveConfig } from 'src/utils/config-loader.js'

/**
 * A page's Store builder config (/config/{page}.json), as the page's
 * preFetch loaded it (ssrContext.pageConfig / window.__PAGE_CONFIG__), kept
 * up to date by the live preview while the owner edits it.
 */
export function usePageConfig(page) {
  const config = ref(null)
  if (process.env.SERVER) config.value = useSSRContext()?.pageConfig || null
  if (process.env.CLIENT && window.__PAGE_CONFIG__ && Object.keys(window.__PAGE_CONFIG__).length) config.value = window.__PAGE_CONFIG__

  let unsubscribe = () => {}
  onMounted(() => {
    unsubscribe = subscribeToLiveConfig(page, (data) => (config.value = data))
  })
  onUnmounted(() => unsubscribe())
  return config
}
