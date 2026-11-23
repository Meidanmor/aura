/**
 * Faster pictures (Settings → General on the store, Qwoo_Webp): the store makes
 * a WebP copy of every photo under its own address ("photo.png.webp") and sends
 * it next to the original:
 *
 *   - Store builder pictures: `webp` on the payload and on each srcset entry
 *     ({ url, width, height, webp, srcset: [{ url, w, webp }] }).
 *   - Product / category pictures (Store API): `webp_src` and `webp_srcset`.
 *
 * They're offered only while the store says the switch is on (the live pointer's
 * `webp`, window.__QWOO_SITE__.webp / globalThis.__QWOO_WEBP on the server), so
 * turning it off shows the originals at once, with no publish. Pictures are drawn as
 * <picture class="pic"><source type="image/webp" …><img …></picture>: a browser
 * without WebP takes the <img> (the <picture> is `display: contents`, app.css).
 */

const URL_RE = /^(\/(?!\/)|https:\/\/)[^\s,"'<>]+$/

export function webpOn() {
  return typeof window === 'undefined' ? !!globalThis.__QWOO_WEBP : !!window.__QWOO_SITE__?.webp
}

/** A Store builder picture's full-size WebP address, or ''. */
export function webpUrl(payload) {
  return webpOn() && payload && typeof payload === 'object' && URL_RE.test(payload.webp || '') ? payload.webp : ''
}

/**
 * A Store builder picture's WebP srcset ("a.png.webp 300w, …", or one address
 * when there's only one file), or undefined.
 */
export function webpSrcsetOf(payload) {
  if (!webpOn() || !payload || typeof payload !== 'object') return undefined
  const list = (Array.isArray(payload.srcset) ? payload.srcset : [])
    .filter((s) => s && URL_RE.test(s.webp || '') && Number.isInteger(s.w) && s.w > 0)
    .map((s) => ({ url: s.webp, w: s.w }))
  const full = Number(payload.width)
  if (URL_RE.test(payload.webp || '') && Number.isInteger(full) && full > 0) list.push({ url: payload.webp, w: full })
  if (!list.length) return webpUrl(payload) || undefined
  const seen = new Set()
  const out = list.sort((a, b) => a.w - b.w).filter((s) => !seen.has(s.w) && seen.add(s.w))
  return out.length > 1 ? out.map((s) => `${s.url} ${s.w}w`).join(', ') : out[0].url
}

/** A product / category picture's WebP srcset (Store API image), or undefined. */
export function webpOfImage(image) {
  if (!webpOn() || !image || typeof image !== 'object') return undefined
  return image.webp_srcset || image.webp_src || undefined
}
