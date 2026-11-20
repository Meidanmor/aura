/**
 * Pictures of the Store builder preview for the dashboard assistant (it checks its own work).
 *
 *   dashboard → frame  { source: 'qwoo-admin', type: 'shot', ask, scale, max }
 *   frame → dashboard  { source: 'qwoo-frontend', type: 'shot', ask, ok, first, page, width, height, screen } | { ok: false, error }
 *
 * first: the first screen exactly as a shopper sees it (fixed and floating buttons where they really are);
 * page: the whole page (up to `max` px tall), shrunk by `scale`. Both JPEG data addresses.
 * Only in the preview frame of our own dashboard (isEditorMessage), and the picture goes back only to it.
 * The picture library loads only when the dashboard asks, never for shoppers.
 */
import { isEditorMessage } from 'src/utils/config-loader.js'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Pictures still loading, up to `ms`. */
async function imagesLoaded(ms) {
  const until = Date.now() + ms
  for (;;) {
    const busy = [...document.images].some((img) => !img.complete && img.loading !== 'lazy')
    if (!busy || Date.now() > until) return
    await wait(150)
  }
}

/** Scrolls through the page once, so lazy pictures and "appear while scrolling" animations show. */
async function scrollThrough(max) {
  const step = Math.max(300, window.innerHeight)
  const end = Math.min(document.documentElement.scrollHeight, max)
  for (let y = 0; y < end; y += step) {
    window.scrollTo({ left: 0, top: y, behavior: 'instant' })
    await wait(140)
  }
  for (const img of document.images) img.loading = 'eager'
  window.scrollTo({ left: 0, top: 0, behavior: 'instant' })
  await imagesLoaded(3500)
  await wait(500)
}

function background() {
  const body = getComputedStyle(document.body).backgroundColor
  return body && body !== 'rgba(0, 0, 0, 0)' && body !== 'transparent' ? body : '#ffffff'
}

export function installPreviewShot() {
  if (typeof window === 'undefined') return
  let busy = false
  window.addEventListener('message', async (event) => {
    const d = event.data
    if (!isEditorMessage(event) || !d || d.source !== 'qwoo-admin' || d.type !== 'shot') return
    const origin = event.origin
    const reply = (msg) => window.parent.postMessage({ source: 'qwoo-frontend', type: 'shot', ask: String(d.ask || ''), ...msg }, origin)
    if (busy) return reply({ ok: false, error: 'busy' })
    busy = true
    try {
      const { domToJpeg } = await import('modern-screenshot')
      const scale = Math.min(1, Math.max(0.3, Number(d.scale) || 1))
      const max = Math.min(14000, Math.max(1000, Number(d.max) || 9000))
      await document.fonts?.ready
      await scrollThrough(max)
      const root = document.documentElement
      const width = window.innerWidth
      const screen = window.innerHeight
      const height = Math.min(root.scrollHeight, max)
      const options = { backgroundColor: background(), quality: 0.82, timeout: 8000, fetch: { requestInit: { cache: 'force-cache' } } }
      const first = await domToJpeg(root, { ...options, width, height: screen, scale: Math.min(1, scale * 1.25) })
      const page = await domToJpeg(root, { ...options, width, height, scale })
      reply({ ok: true, first, page, width, height, screen })
    } catch (e) {
      reply({ ok: false, error: String(e?.message || e).slice(0, 200) })
    } finally {
      busy = false
    }
  })
}
