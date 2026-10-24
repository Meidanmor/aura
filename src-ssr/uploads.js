/**
 * The store's uploads folder on the storefront's own domain (see server.js).
 */
import { Readable } from 'node:stream'

// The store's uploads folder, served through this domain (see the proxy below).
export const UPLOADS_RE = /^\/wp-content\/uploads\/[^?#]+\.(jpe?g|png|gif|webp|avif|svg|mp4|webm|pdf|woff2?)(\?|$)/i

// Hostinger's server sometimes refuses a burst of photo requests (an empty
// 429): they all come from this server's address, as if one visitor sent them.
// Waits before each new try (or the server's Retry-After, at most 3s).
const UPLOAD_RETRY_WAITS = [300, 900, 2000]
const UPLOAD_PASS_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']

/**
 * Serves the store's uploads (photos, videos, PDFs, fonts) on this domain.
 * Vercel's CDN keeps a found file a year (WordPress gives a replaced file a
 * new name), a missing one a minute, and never a refused or failed answer,
 * so the next visitor tries again.
 */
export function uploadsHandler (backendTarget) {
  const base = backendTarget.replace(/\/+$/, '')
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  return async (req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || !UPLOADS_RE.test(req.originalUrl)) return next()

    // No cookies: only what a file answer needs. Unpacked files, so the
    // length passed on matches the body.
    const headers = { 'accept-encoding': 'identity' }
    for (const name of ['range', 'if-none-match', 'if-modified-since', 'accept', 'user-agent']) {
      if (req.headers[name]) headers[name] = req.headers[name]
    }

    let answer
    try {
      for (let tries = 0; ; tries++) {
        answer = await fetch(base + req.originalUrl, { method: req.method, headers, redirect: 'manual' })
        if (answer.status !== 429 || tries >= UPLOAD_RETRY_WAITS.length) break
        await answer.body?.cancel()
        const after = Number(answer.headers.get('retry-after'))
        await wait(after > 0 ? Math.min(after * 1000, 3000) : UPLOAD_RETRY_WAITS[tries])
      }
    } catch {
      res.status(502).set('Cache-Control', 'no-store').end()
      return
    }

    res.status(answer.status)
    for (const name of UPLOAD_PASS_HEADERS) {
      const value = answer.headers.get(name)
      if (value) res.setHeader(name, value)
    }
    // Now on the storefront's own domain: a file opened by itself (an SVG
    // with a script, say) can't run anything here.
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox")
    res.setHeader('X-Content-Type-Options', 'nosniff')
    if (answer.status === 200) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('Vercel-CDN-Cache-Control', 'max-age=31536000')
    } else if (answer.status === 404) {
      res.setHeader('Cache-Control', 'public, max-age=60')
    } else if (answer.status !== 206 && answer.status !== 304) {
      res.setHeader('Cache-Control', 'no-store')
    }

    if (req.method === 'HEAD' || !answer.body || answer.status === 304) {
      await answer.body?.cancel()
      res.end()
      return
    }
    const body = Readable.fromWeb(answer.body)
    body.on('error', () => res.destroy())
    res.on('close', () => body.destroy())
    body.pipe(res)
  }
}
