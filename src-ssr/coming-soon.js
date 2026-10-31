/**
 * A hidden store (dashboard → Settings → General → Store visibility), or one
 * suspended by the platform ("This store is unavailable" for everyone, 503).
 *
 * Pages answer a small "Coming soon" page instead of the store. The owner's
 * private preview link (/?preview={key}) puts the key in a cookie on that
 * browser and opens the real store there; the store also takes orders only
 * from such a browser (the proxy passes the cookie on). The live check
 * (site-content.js) gives a hash of the key, never the key.
 */
import { createHash } from 'node:crypto'
import { siteVisibility } from './site-content.js'

const COOKIE = 'qwoo_preview'
const KEY_RE = /^[a-f0-9]{32}$/
/** Files and API calls: only page addresses get the Coming soon page. */
const NOT_PAGE_RE = /^\/(assets|wp-json|wp-admin|wp-content|_quasar|js|css|fonts|icons|__site)\/|\.[a-z0-9]{2,5}$/i

const TEXTS = {
  en: { title: 'Coming soon', line: "We're getting the store ready. Come back soon." },
  he: { title: 'בקרוב', line: 'אנחנו מכינים את החנות. חזרו אלינו בקרוב.' },
}
/** A store suspended by the platform: the same page for everyone, no way in. */
const UNAVAILABLE = {
  en: { title: 'This store is unavailable', line: "It can't be visited right now." },
  he: { title: 'החנות לא זמינה', line: 'אי אפשר להיכנס אליה כרגע.' },
}

const sha = (value) => createHash('sha256').update(value).digest('hex')

function cookieOf(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const at = part.indexOf('=')
    if (at > 0 && part.slice(0, at).trim() === name) return part.slice(at + 1).trim()
  }
  return ''
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

function page({ name, lang }, texts = TEXTS) {
  const text = texts[lang] || texts.en
  const title = name ? `${escapeHtml(name)} · ${text.title}` : text.title
  return `<!doctype html>
<html lang="${lang}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<style>
  :root { color-scheme: light dark; --bg: #faf9f7; --fg: #1c1b1a; --muted: #6b6762; }
  @media (prefers-color-scheme: dark) { :root { --bg: #141312; --fg: #f3f1ee; --muted: #a29d97; } }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body { display: grid; place-items: center; padding: 24px 16px; background: var(--bg); color: var(--fg);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Heebo, Arial, sans-serif; text-align: center; }
  main { max-width: 520px; }
  .name { margin: 0 0 20px; font-size: 15px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
  h1 { margin: 0 0 14px; font-size: clamp(36px, 8vw, 56px); font-weight: 600; line-height: 1.1; letter-spacing: -.01em; }
  p { margin: 0; font-size: 17px; line-height: 1.6; color: var(--muted); }
</style>
</head>
<body>
<main>
${name ? `  <p class="name">${escapeHtml(name)}</p>\n` : ''}  <h1>${text.title}</h1>
  <p>${text.line}</p>
</main>
</body>
</html>`
}

const noStore = (res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store')
}

export function comingSoonMiddleware() {
  return (req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || NOT_PAGE_RE.test(req.path)) return next()
    const v = siteVisibility()
    if (v?.suspended) return answer(req, res, page(v, UNAVAILABLE), 503)
    if (!v?.hidden) return next()

    // The preview link: remember the key on this browser, then the same address without it.
    const key = typeof req.query.preview === 'string' ? req.query.preview : ''
    if (KEY_RE.test(key) && sha(key) === v.preview) {
      const secure = String(req.headers['x-forwarded-proto'] || '').startsWith('https') || req.secure
      res.setHeader('Set-Cookie', `${COOKIE}=${key}; Path=/; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`)
      // The Store builder's live preview (a frame on the dashboard's site, where
      // the cookie may not be kept): the page right away, with its address as it is.
      if (req.query.qwoo_editor) {
        res.setHeader('X-Robots-Tag', 'noindex')
        noStore(res)
        return next()
      }
      const params = new URLSearchParams(req.query)
      params.delete('preview')
      const rest = params.toString()
      noStore(res)
      return res.redirect(302, req.path + (rest ? `?${rest}` : ''))
    }

    const own = cookieOf(req, COOKIE)
    if (KEY_RE.test(own) && sha(own) === v.preview) {
      // Never index a preview, and never keep it anywhere shared.
      res.setHeader('X-Robots-Tag', 'noindex')
      noStore(res)
      return next()
    }

    return answer(req, res, page(v), 200)
  }
}

/** The small page instead of the store: never cached, never indexed. */
function answer(req, res, html, status) {
  noStore(res)
  res.setHeader('X-Robots-Tag', 'noindex')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
  res.status(status)
  return req.method === 'HEAD' ? res.end() : res.end(html)
}
