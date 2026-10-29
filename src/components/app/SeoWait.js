import { onServerPrefetch, useSSRContext } from 'vue'

/**
 * Server only, at the end of the layout: a page that asked for its SEO answer without
 * waiting for it (useSeo.js deferSeo()) has its sections load meanwhile; the render waits
 * for the answer here, so the page's tags are filled in before the page goes out.
 * Draws nothing.
 */
export default {
  name: 'SeoWait',
  setup() {
    if (process.env.SERVER) {
      const ssr = useSSRContext()
      onServerPrefetch(() => ssr?.seoPromise)
    }
    return () => null
  },
}
