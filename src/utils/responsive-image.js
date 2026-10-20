/**
 * Smaller copies of Store builder images. The store publishes WordPress's
 * own smaller sizes next to each image (`srcset: [{ url, w }]` in the image
 * payload, since store 2026-10-20); the browser then picks the smallest one
 * that's still sharp for the box the image is drawn in.
 *
 *   <img :srcset="srcsetOf(payload)" :sizes="LAZY_SIZES" v-fit-sizes ... />
 *
 * Only for lazy images: the page's first image (priority-image.js) keeps
 * one file, so its <head> preload and the <img> always fetch the same one.
 */

const URL_RE = /^(\/(?!\/)|https:\/\/)[^\s,"'<>]+$/

/** "a.jpg 300w, b.jpg 768w, …" for an image payload, or undefined when it has no smaller copies. */
export function srcsetOf(img) {
  if (!img || typeof img !== 'object' || !Array.isArray(img.srcset)) return undefined
  const seen = new Set()
  const list = img.srcset
    .filter((s) => s && URL_RE.test(s.url || '') && Number.isInteger(s.w) && s.w > 0)
    .map((s) => ({ url: s.url, w: s.w }))
  const full = Number(img.width)
  if (URL_RE.test(img.url || '') && Number.isInteger(full) && full > 0) list.push({ url: img.url, w: full })
  const out = list
    .sort((a, b) => a.w - b.w)
    .filter((s) => !seen.has(s.w) && seen.add(s.w))
    .map((s) => `${s.url} ${s.w}w`)
  return out.length > 1 ? out.join(', ') : undefined
}

/**
 * The `sizes` sent with the page, until v-fit-sizes measures the box
 * (before a lazy image starts loading). Not "auto": it ignores cropping, so
 * a cropped image would load small, then again bigger.
 */
export const LAZY_SIZES = '(max-width: 767px) 100vw, 50vw'

let observer = null
const boxes = new WeakMap()

/**
 * The image's width / height: from the loaded file, else its width and
 * height attributes, else a WordPress file name in the srcset ("-300x164.jpg").
 */
function ratioOf(el) {
  if (el.naturalWidth && el.naturalHeight) return el.naturalWidth / el.naturalHeight
  const w = Number(el.getAttribute('width'))
  const h = Number(el.getAttribute('height'))
  if (w > 0 && h > 0) return w / h
  const m = /-(\d+)x(\d+)\.\w+\s/.exec(el.getAttribute('srcset') || '')
  return m && +m[2] > 0 ? +m[1] / +m[2] : 0
}

/** CSS pixels the image needs: a cropped ("cover") image is drawn larger than its box. */
function neededWidth(el, w, h) {
  const ratio = getComputedStyle(el).objectFit === 'cover' ? ratioOf(el) : 0
  return ratio > 0 && h > 0 ? Math.max(w, h * ratio) : w
}

function fit(el, w, h) {
  if (!el.getAttribute('srcset') || !(w > 0)) return
  const need = Math.ceil(neededWidth(el, w, h))
  const now = parseInt(el.getAttribute('sizes'), 10)
  // Once a file is chosen, keep it: a second download costs more than a slightly
  // smaller or larger file. Only a much bigger box (a phone turned sideways) asks again.
  if (el.currentSrc && !(Number.isFinite(now) && need > now * 1.5)) return
  if (now !== need) el.setAttribute('sizes', `${need}px`)
}

/** v-fit-sizes: keeps an <img>'s `sizes` at the width it's really drawn at. */
export const vFitSizes = {
  mounted(el) {
    if (typeof ResizeObserver === 'undefined') return
    if (!observer) observer = new ResizeObserver((entries) => {
      for (const e of entries) {
        const box = e.contentRect
        boxes.set(e.target, box)
        fit(e.target, box.width, box.height)
      }
    })
    observer.observe(el)
  },
  updated(el) {
    const box = boxes.get(el)
    if (box) fit(el, box.width, box.height)
  },
  unmounted(el) {
    observer?.unobserve(el)
    boxes.delete(el)
  },
}
