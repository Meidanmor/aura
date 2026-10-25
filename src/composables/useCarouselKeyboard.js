export function useCarouselKeyboard(slideRef, totalSlidesRef) {
  function onKeydown(e) {
    // Right-to-left pages: the next slide is to the left.
    const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
    const key = rtl && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      ? (e.key === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft')
      : e.key
    switch (key) {
      case 'ArrowRight':
        slideRef.value =
          (slideRef.value + 1) % totalSlidesRef.value
        break

      case 'ArrowLeft':
        slideRef.value =
          (slideRef.value - 1 + totalSlidesRef.value) % totalSlidesRef.value
        break

      case 'Home':
        slideRef.value = 0
        break

      case 'End':
        slideRef.value = totalSlidesRef.value - 1
        break
    }
  }

  return {
    onKeydown
  }
}