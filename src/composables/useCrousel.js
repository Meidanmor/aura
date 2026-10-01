// src/composables/useCarousel.js
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useCarouselKeyboard } from './useCarouselKeyboard'

const defaultChunkSizes = { xs: 1, sm: 2, md: 3 }
const PER_VIEW_FALLBACK = { desktop: 3, tablet: 2, mobile: 1 }

/**
 * Splits items into carousel slides.
 *
 * Options (one of):
 *   chunkSizes: { xs, sm, md } — Quasar breakpoints (< 600 / < 1024 / >= 1024).
 *   perView:    getter returning { desktop, tablet, mobile } — Shop Builder
 *               breakpoints (<= 767 / 768–1023 / >= 1024). It's a getter so a
 *               changed value (Live Preview) is picked up on the next
 *               recompute(); watch `device` and the value to trigger it.
 */
export function useCarousel(getItems, { chunkSizes = defaultChunkSizes, perView = null } = {}) {
  const $q = useQuasar()
  const slide = ref(0)
  const carouselKey = ref(0)
  const slideChunks = ref([])
  const clientMounted = ref(false)

  const pick = (value, fallback) => Math.max(1, Math.min(8, Number(value) || fallback))

  // Current breakpoint bucket; components watch this to re-chunk on resize.
  const device = computed(() => {
    if (!perView) return $q.screen.name
    const w = $q.screen.width
    return w <= 767 ? 'mobile' : w <= 1023 ? 'tablet' : 'desktop'
  })

  const currentChunkSize = () => {
    if (perView) {
      const p = perView() || {}
      // SSR (and the first client render) always uses the desktop count.
      const d = clientMounted.value ? device.value : 'desktop'
      return pick(p[d], PER_VIEW_FALLBACK[d])
    }
    return clientMounted.value
        ? ($q.screen.lt.sm
            ? chunkSizes.xs
            : $q.screen.lt.md
                ? chunkSizes.sm
                : chunkSizes.md)
        : chunkSizes.md
  }

  const activeChunkSize = ref(currentChunkSize())

  const getChunks = (array, size) => {
    if (!Array.isArray(array) || !array.length) return []
    const chunks = []
    for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size))
    return chunks
  }

  const recompute = (forceRemount = false) => {
    const result = getItems()

    const finish = (items) => {
      const chunkSize = currentChunkSize()
      activeChunkSize.value = chunkSize

      const chunks = getChunks(items, chunkSize)
      slideChunks.value = chunks

      slide.value = Math.min(
          slide.value,
          Math.max(0, chunks.length - 1)
      )

      if (forceRemount) {
        carouselKey.value++
      }
    }

    if (result && typeof result.then === 'function') {
      return result.then(finish)
    }

    finish(result)
    return Promise.resolve()
  }

  const markMounted = () => { clientMounted.value = true }
  const showControls = computed(() => slideChunks.value.length > 1)
  const total = computed(() => slideChunks.value.length)
  const { onKeydown } = useCarouselKeyboard(slide, total)

  return { slide, carouselKey, slideChunks, activeChunkSize, device, showControls, total, onKeydown, recompute, markMounted }
}
