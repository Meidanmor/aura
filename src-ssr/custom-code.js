/**
 * Tracking & custom code (dashboard → Settings → Tracking & code), on the
 * server: which snippets go into a page, and the page's security rules.
 *
 * The store's settings come from site-content.js (siteCode()). Snippets the
 * shopper has already allowed (src/utils/custom-code-rules.js) are written
 * into the page with its nonce; the rest wait in window.__QWOO_CODE__ until
 * the consent banner allows them (src/utils/custom-code.js).
 *
 * Testing: the private link (/?qwoo_code_test={key}) keeps the key in a
 * cookie on that browser. That browser also runs the Testing snippets, with a
 * relaxed policy plus a report-only copy of the strict one: what the strict
 * one would block is reported to the store, which adds it to the allowed
 * addresses. The store only gives a hash of the key.
 */
import { createHash } from 'node:crypto'
import { siteCode } from './site-content.js'
import { CONSENT_COOKIE, allowedGroups, forBrowser, needsConsent, onPage, parseConsent } from '../src/utils/custom-code-rules.js'

const COOKIE = 'qwoo_code_test'
const KEY_RE = /^[a-f0-9]{32}$/
const NOT_PAGE_RE = /^\/(assets|wp-json|wp-admin|wp-content|_quasar|js|css|fonts|icons|__site)\/|\.[a-z0-9]{2,5}$/i
const HOST_RE = /^(\*\.)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}$/

const sha = (value) => createHash('sha256').update(value).digest('hex')

function cookieOf(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const at = part.indexOf('=')
    if (at > 0 && part.slice(0, at).trim() === name) return decodeURIComponent(part.slice(at + 1).trim())
  }
  return ''
}

const isSecure = (req) => String(req.headers['x-forwarded-proto'] || '').startsWith('https') || req.secure

/** The test link: remember the key on this browser (or forget it), then the same address without it. */
export function codeTestMiddleware() {
  return (req, res, next) => {
    const key = typeof req.query?.qwoo_code_test === 'string' ? req.query.qwoo_code_test : ''
    if (!key || req.method !== 'GET' || NOT_PAGE_RE.test(req.path)) return next()
    const c = siteCode()
    const secure = isSecure(req) ? '; Secure' : ''
    if (key === 'off') {
      res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`)
    } else if (KEY_RE.test(key) && c?.test && sha(key) === c.test) {
      res.setHeader('Set-Cookie', `${COOKIE}=${key}; Path=/; Max-Age=${60 * 60 * 24 * 7}; HttpOnly; SameSite=Lax${secure}`)
    } else {
      return next()
    }
    const params = new URLSearchParams(req.query)
    params.delete('qwoo_code_test')
    const rest = params.toString()
    res.setHeader('Cache-Control', 'no-store')
    return res.redirect(302, req.path + (rest ? `?${rest}` : ''))
  }
}

/** Every <script> in the owner's code gets the page's nonce (the only scripts the policy runs). */
const withNonce = (html, nonce) => String(html).replace(/<script\b([^>]*)>/gi, (tag, attrs) => `<script${attrs.replace(/\snonce\s*=\s*("[^"]*"|'[^']*'|\S+)/gi, '')} nonce="${nonce}">`)

const cleanHosts = (list) => (Array.isArray(list) ? list.filter((h) => typeof h === 'string' && HOST_RE.test(h)) : [])

/**
 * The page's code: { head, bodyStart, bodyEnd, state, extra, relaxed, eval },
 * or null (nothing set up, or the Store builder's preview, where snippets
 * never run). where: chromeTarget() of the rendered route.
 */
export function pageCode(req, { where, nonce }) {
  const c = siteCode()
  if (!c || req.query?.qwoo_editor === '1') return null

  const own = cookieOf(req, COOKIE)
  const testing = !!(c.test && KEY_RE.test(own) && sha(own) === c.test)
  const snippets = forBrowser(c.snippets, testing)
  const mode = c.consent?.mode === 'notice' ? 'notice' : 'ask'
  const allowed = allowedGroups(mode, parseConsent(cookieOf(req, CONSENT_COOKIE)))

  const out = { head: '', bodyStart: '', bodyEnd: '', ran: [] }
  if (snippets.length) {
    // Google's consent signals before any Google tag (Tag Manager's tags and GA4 follow them).
    const g = (yes) => (yes ? "'granted'" : "'denied'")
    // qwoo.on() works before the app starts (src/utils/custom-code.js takes the queue over).
    // What the security rules block while the page loads is kept for it too (the app reports it).
    out.head += `<script nonce="${nonce}">window.qwoo=window.qwoo||{q:[],v:[],on:function(n,f){this.q.push([n,f])}};document.addEventListener('securitypolicyviolation',function(e){if(window.qwoo.v)window.qwoo.v.push(e)});window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('consent','default',{analytics_storage:${g(allowed.analytics)},ad_storage:${g(allowed.marketing)},ad_user_data:${g(allowed.marketing)},ad_personalization:${g(allowed.marketing)},wait_for_update:500});</script>`
  }
  for (const s of snippets) {
    if (!allowed[s.group] || !onPage(s, where || { target: '' })) continue
    const html = `<!-- ${String(s.name || s.id).replace(/--/g, '')} -->${withNonce(s.code, nonce)}`
    if (s.place === 'body_start') out.bodyStart += html
    else if (s.place === 'body_end') out.bodyEnd += html
    else out.head += html
    out.ran.push(s.id)
  }

  const shortcuts = {}
  for (const [key, s] of Object.entries(c.shortcuts || {})) {
    if (s?.id && (s.state === 'live' || (testing && s.state === 'testing'))) shortcuts[key] = s.id
  }
  const csp = c.csp || {}
  return {
    ...out,
    testing,
    relaxed: testing,
    eval: !!c.eval,
    extra: Object.fromEntries(['script', 'connect', 'frame', 'style', 'font', 'media'].map((k) => [k, cleanHosts(csp[k])])),
    // window.__QWOO_CODE__ (src/utils/custom-code.js).
    state: snippets.length
      ? {
          mode,
          texts: c.consent?.texts || {},
          ask: needsConsent(snippets),
          snippets: snippets.map(({ id, kind, name, code, place, where: w, targets, page_paths, group }) => ({ id, kind, name, code, place, where: w, targets, page_paths, group })),
          shortcuts,
          ran: out.ran,
          testing,
        }
      : { mode, texts: c.consent?.texts || {}, ask: false, snippets: [], shortcuts: {}, ran: [], testing },
  }
}

/**
 * The page's Content-Security-Policy. code: pageCode()'s answer (its allowed
 * addresses are added), relaxed: any https address (the test browser).
 */
export function contentSecurityPolicy({ nonce, backend, dev, frameAncestors, code, relaxed }) {
  const add = (kind) => {
    // https only (a bare host would also take http on an http page).
    const hosts = (code?.extra?.[kind] || []).map((h) => `https://${h}`)
    return hosts.length ? ' ' + hosts.join(' ') : ''
  }
  const any = (value) => (relaxed ? ` ${value}` : '')
  return "default-src 'self'; " +
    `script-src 'self' 'nonce-${nonce}'${code?.eval ? " 'unsafe-eval'" : ''} https://accounts.google.com https://js.stripe.com https://hcaptcha.com https://*.hcaptcha.com${add('script')}${any('https:')}; ` +
    `style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com${add('style')}${any('https:')}; ` +
    "img-src 'self' data: https:; " +
    // The dev server's hot-reload websocket only exists locally.
    `connect-src 'self' ${backend || ''} https://api.stripe.com https://hcaptcha.com https://*.hcaptcha.com${add('connect')}${any('https: wss:')}${dev ? ' ws://localhost:* wss://localhost:*' : ''}; ` +
    `font-src 'self' https://fonts.gstatic.com${add('font')}${any('https: data:')}; ` +
    // Videos (Video block + video backgrounds) are uploads served by
    // the WP backend or files on this site — the plugin only accepts
    // "video file URL"s on those hosts. YouTube/Vimeo play in iframes.
    `media-src 'self' ${backend || ''}${add('media')}${any('https: blob:')}; ` +
    // Video embeds: only the two exact player hosts the frontend
    // builds URLs for (privacy-enhanced YouTube + Vimeo), plus the owner's trackers.
    `frame-src https://accounts.google.com https://js.stripe.com https://hooks.stripe.com https://hcaptcha.com https://*.hcaptcha.com https://www.youtube-nocookie.com https://player.vimeo.com${add('frame')}${any('https:')}; ` +
    // No plugins (<object>/<embed>), no <base> hijacking, and forms
    // may only submit to this site (the app posts via fetch; Google
    // sign-in and Stripe use redirects / their own iframes).
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    `frame-ancestors ${frameAncestors};`
}
