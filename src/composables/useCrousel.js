// src/composables/useCarousel.js
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useCarouselKeyboard } from './useCarouselKeyboard'

const defaultChunkSizes = { xs: 1, sm: 2, md: 3 }

export function useCarousel(getItems, { chunkSizes = defaultChunkSizes } = {}) {
  const $q = useQuasar()
  const slide = ref(0)
  const carouselKey = ref(0)
  const slideChunks = ref([])
  const clientMounted = ref(false)
  const activeChunkSize = ref(chunkSizes.md) // 1. Add a ref to track the active size

  const getChunks = (array, size) => {
    if (!Array.isArray(array) || !array.length) return []
    const chunks = []
    for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size))
    return chunks
  }

  const recompute = (forceRemount = false) => {
    const result = getItems()

    const finish = (items) => {
      const chunkSize = clientMounted.value
          ? ($q.screen.lt.sm
              ? chunkSizes.xs
              : $q.screen.lt.md
                  ? chunkSizes.sm
                  : chunkSizes.md)
          : chunkSizes.md

      activeChunkSize.value = chunkSize // 2. Store the calculated size

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

  // 3. Return activeChunkSize to the template
  return { slide, carouselKey, slideChunks, activeChunkSize, showControls, total, onKeydown, recompute, markMounted }
}
