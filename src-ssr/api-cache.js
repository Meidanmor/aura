/**
 * The store's public answers (products, categories, the price range, SEO, the blog, reviews),
 * kept by this server and given again until something shoppers can see changes on the store.
 *
 * Every call to WordPress costs a few hundred ms (it starts up for each one), and a page made
 * several. The store keeps a content stamp that changes with any product, price, stock,
 * category, post, review or setting (qwoo-core's Qwoo_Content_Stamp); site-content.js reads it
 * every second from the store's pointer file. An answer is kept with the stamp it was fetched
 * under and only given while that's still the stamp, so a change shows within about a second.
 *
 * Used by the page render's own calls (render.js) and by the browser's calls through /wp-json
 * (apiCacheMiddleware, before the proxy in server.js). Never for carts, checkout, accounts or
 * anything sent with a signed-in customer's cookie; product answers only when they're the same
 * for every shopper (no taxes by address). An older store (no stamp) keeps nothing.
 */
import { BACKEND_USER_AGENT } from './uploads.js'
import { contentTag, currentSite, originOf, sharedAnswers } from './site-content.js'

const BACKEND = (process.env.WP_BACKEND_URL || '').replace(/\/+$/, '')
const SECRET = process.env.PROXY_SHARED_SECRET || ''
/** QWOO_API_CACHE=off (a Vercel environment variable) turns it off: every answer comes from the store again. */
const OFF = process.env.QWOO_API_CACHE === 'off'

/** Answers kept (all together, least recently used go first), one answer at most, and for how long at most. */
const MAX_BYTES = 48 * 1024 * 1024
const MAX_ENTRY = 4 * 1024 * 1024
const MAX_AGE_MS = 10 * 60 * 1000

/** The same for everyone (pwa/config: the store's push key and when to ask, read once per visit). */
const PUBLIC_RE = /^\/wp-json\/qwoo\/v1\/(seo|blog|blog\/post|blog\/authors|reviews|pwa\/config)(\?|$)/
/** Products, categories, attributes and the price range: the same for everyone unless taxes follow the shopper's address. */
const PRODUCTS_RE = /^\/wp-json\/(wc\/store\/v1\/products(\/[^?]*)?|qwoo\/v1\/products-meta)(\?|$)/
/** SEO answers a missing page with 404: worth keeping too. */
const KEEP_404_RE = /^\/wp-json\/qwoo\/v1\/seo\?/
const KEEP_HEADERS = ['content-type', 'x-wp-total', 'x-wp-totalpages']

const entries = new Map() // key → { tag, at, status, headers, body }
let bytes = 0
const inflight = new Map() // key → { tag, promise }

/** Whether an address (path + query) is one of the store's public answers. */
export function cacheablePath(path) {
  return PUBLIC_RE.test(path) || (PRODUCTS_RE.test(path) && sharedAnswers())
}

function keep(key, entry) {
  const old = entries.get(key)
  if (old) bytes -= old.body.length
  entries.set(key, entry)
  bytes += entry.body.length
  for (const [k, v] of entries) {
    if (bytes <= MAX_BYTES) break
    entries.delete(k)
    bytes -= v.body.length
  }
}

const answer = (entry, state) => new Response(entry.body, { status: entry.status, headers: { ...entry.headers, 'x-qwoo-cache': state } })

/**
 * The answer for `path` (in language `lang`): kept, or from `call()` (the real request, a fetch
 * Response). Several requests for the same answer at once share one call.
 */
export async function cachedAnswer(path, lang, call) {
  const tag = OFF ? null : contentTag()
  if (!tag) return call()
  const key = `${lang || ''} ${path}`

  const hit = entries.get(key)
  if (hit && hit.tag === tag && Date.now() - hit.at < MAX_AGE_MS) {
    entries.delete(key)
    entries.set(key, hit) // most recently used last
    return answer(hit, 'HIT')
  }

  let job = inflight.get(key)
  if (!job || job.tag !== tag) {
    const promise = (async () => {
      const res = await call()
      const headers = {}
      for (const name of KEEP_HEADERS) {
        const value = res.headers.get(name)
        if (value !== null) headers[name] = value
      }
      const entry = { tag, at: Date.now(), status: res.status, headers, body: Buffer.from(await res.arrayBuffer()) }
      if ((res.status === 200 || (res.status === 404 && KEEP_404_RE.test(path))) && entry.body.length <= MAX_ENTRY) keep(key, entry)
      return entry
    })()
    job = { tag, promise }
    inflight.set(key, job)
    promise.catch(() => {}).finally(() => { if (inflight.get(key) === job) inflight.delete(key) })
  }
  return answer(await job.promise, 'MISS')
}

/** A signed-in customer's request (WordPress's login cookie, which the proxy hands the browser). */
const signedIn = (req) => /(^|;\s*)wordpress_logged_in_/.test(String(req.headers.cookie || ''))

/**
 * The browser's GETs of the store's public answers (moving between pages in the app): from the
 * kept answers, else straight from the store (signed like the proxy signs them). Everything else
 * goes on to the proxy.
 */
export function apiCacheMiddleware() {
  return async (req, res, next) => {
    if (OFF || !BACKEND || !SECRET || req.method !== 'GET' || !req.url.startsWith('/wp-json/') || signedIn(req)) return next()
    // The stamp checked like on a page (a plain file, usually no wait at all).
    await currentSite(originOf(req))
    if (!contentTag() || !cacheablePath(req.url)) return next()

    const lang = typeof req.headers['x-qwoo-lang'] === 'string' ? req.headers['x-qwoo-lang'].slice(0, 12) : ''
    try {
      const ans = await cachedAnswer(req.url, lang, () => fetch(BACKEND + req.url, {
        headers: {
          'X-Proxy-Secret': SECRET,
          'User-Agent': BACKEND_USER_AGENT,
          'X-Qwoo-Uploads': '1',
          ...(lang ? { 'X-Qwoo-Lang': lang } : {}),
          ...(req.headers['user-agent'] ? { 'X-Qwoo-Client-UA': String(req.headers['user-agent']).slice(0, 512) } : {}),
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      }))
      res.status(ans.status)
      ans.headers.forEach((value, name) => res.setHeader(name, value))
      // Like the proxy's answers: never kept by the browser (server.js).
      res.setHeader('Cache-Control', 'private, no-cache, max-age=0')
      res.end(Buffer.from(await ans.arrayBuffer()))
    } catch (err) {
      console.error('[api-cache]', err?.message || err)
      if (!res.headersSent) next()
    }
  }
}
