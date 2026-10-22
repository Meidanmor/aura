/**
 * More info about this file:
 * https://v2.quasar.dev/quasar-cli-vite/developing-ssr/ssr-webserver
 *
 * Runs in Node context.
 */

/**
 * Make sure to yarn add / npm install (in your project root)
 * anything you import here (except for express and compression).
 */
import express from 'express'
import compression from 'compression'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { siteContentMiddleware } from './site-content.js'
import {
  defineSsrCreate,
  defineSsrListen,
  defineSsrClose,
  defineSsrServeStaticContent,
  defineSsrRenderPreloadTag
} from '#q-app/wrappers'

/**
 * Create your webserver and return its instance.
 * If needed, prepare your webserver to receive
 * connect-like middlewares.
 *
 * Can be async: defineSsrCreate(async ({ ... }) => { ... })
 */

// The store's uploads folder, served through this domain (see the proxy below).
const UPLOADS_RE = /^\/wp-content\/uploads\/[^?#]+\.(jpe?g|png|gif|webp|avif|svg|mp4|webm|pdf|woff2?)(\?|$)/i

export const create = defineSsrCreate(({ folders }) => {
  const app = express()
  app.disable('x-powered-by')

  if (process.env.PROD) {
    app.use(compression())
  }

  // The store's published files, read while running (before the built-in
  // static files, which they replace). See site-content.js.
  app.use(siteContentMiddleware({ publicDir: folders?.public || '' }))

  const backendTarget = process.env.WP_BACKEND_URL // server-only env var, no VITE_ prefix

  if (backendTarget) {
    const proxySecret = process.env.PROXY_SHARED_SECRET

    // Without this, every proxied request to a protected route (wc/store,
    // qwoo) silently goes out with no X-Proxy-Secret header (or the literal
    // string "undefined") and gets rejected by the backend — which looks
    // like a mysterious outage rather than the misconfiguration it is.
    // Fail at startup instead, where it's obvious what's wrong.
    if (!proxySecret) {
      throw new Error(
        'PROXY_SHARED_SECRET is not set but WP_BACKEND_URL is configured. ' +
        'Set PROXY_SHARED_SECRET (copied from Technical Settings → CORS & Frontend Domain ' +
        'in the qwoo-core plugin) before starting the server.'
      )
    }

    app.use(createProxyMiddleware({
      target: backendTarget,
      changeOrigin: true,
      secure: true,
      pathFilter: (pathname, req) => {
        return (
            pathname.startsWith('/wp-json') ||
            pathname.startsWith('/wp-admin') ||
            (UPLOADS_RE.test(pathname) && (req.method === 'GET' || req.method === 'HEAD')) ||
            req.query['wc-ajax'] !== undefined
        )
      },
      cookieDomainRewrite: {
        [new URL(backendTarget).hostname]: ''
      },
      on: {
        proxyReq: (proxyReq, req) => {
          proxyReq.setHeader('X-Proxy-Secret', proxySecret)
          // This storefront serves the uploads folder (below): the store's
          // answers then give photo addresses on this domain.
          if (req.url?.startsWith('/wp-json')) proxyReq.setHeader('X-Qwoo-Uploads', '1')
          else if (UPLOADS_RE.test(req.url || '')) proxyReq.removeHeader('cookie')
        },
        // Hosts like Hostinger stamp every response with a week-long public
        // cache (Cache-Control: public, max-age=604800) — REST answers
        // included, errors too — so browsers kept serving old products.
        // API answers must always be asked for again.
        proxyRes: (proxyRes, req) => {
          // Uploads (photos, videos): Vercel's CDN keeps a file a year
          // (WordPress gives a replaced file a new name); a missing one a minute.
          if (UPLOADS_RE.test(req.url || '')) {
            delete proxyRes.headers['set-cookie']
            delete proxyRes.headers['expires']
            // Now on the storefront's own domain: a file opened by itself (an SVG
            // with a script, say) can't run anything here.
            proxyRes.headers['content-security-policy'] = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox"
            proxyRes.headers['x-content-type-options'] = 'nosniff'
            if (proxyRes.statusCode === 200) {
              proxyRes.headers['cache-control'] = 'public, max-age=31536000, immutable'
              proxyRes.headers['vercel-cdn-cache-control'] = 'max-age=31536000'
            } else if (proxyRes.statusCode !== 206) {
              proxyRes.headers['cache-control'] = 'public, max-age=60'
            }
            return
          }
          if (!req.url?.startsWith('/wp-json')) return
          proxyRes.headers['cache-control'] = 'private, no-cache, max-age=0'
          delete proxyRes.headers['expires']
        }
      }
    }))
  }

  return app
})
/**
 * You need to make the server listen to the indicated port
 * and return the listening instance or whatever you need to
 * close the server with.
 *
 * The "listenResult" param for the "close()" definition below
 * is what you return here.
 *
 * For production, you can instead export your
 * handler for serverless use or whatever else fits your needs.
 *
 * Can be async: defineSsrListen(async ({ app, devHttpsApp, port }) => { ... })
 */
export const listen = defineSsrListen(async ({ app, devHttpsApp, port }) => {
  if (process.env.PROD) {
    // Vercel serverless: no port to listen on — export the app itself,
    // since Express apps are valid (req, res) => {} handlers.
    return { app }
  }

  // Local dev: behave exactly as before
  const server = devHttpsApp || app
  return server.listen(port, () => {})
})

/**
 * Should close the server and free up any resources.
 * Will be used on development only when the server needs
 * to be rebooted.
 *
 * Should you need the result of the "listen()" call above,
 * you can use the "listenResult" param.
 *
 * Can be async: defineSsrClose(async ({ listenResult }) => { ... })
 */
export const close = defineSsrClose(({ listenResult }) => {
  return listenResult.close()
})

// "assets/IndexPage-C3Q_Mkj-.js": Vite's hashed build files.
const hashedRE = /[\\/]assets[\\/][^\\/]+-[\w-]{8}\.(js|css|woff2?|png|jpe?g|svg|webp)$/

const maxAge = process.env.DEV
  ? 0
  : 1000 * 60 * 60 * 24 * 30

/**
 * Should return a function that will be used to configure the webserver
 * to serve static content at "urlPath" from "pathToServe" folder/file.
 *
 * Notice resolve.urlPath(urlPath) and resolve.public(pathToServe) usages.
 *
 * Can be async: defineSsrServeStaticContent(async ({ app, resolve }) => {
 * Can return an async function: return async ({ urlPath = '/', pathToServe = '.', opts = {} }) => {
 */
export const serveStaticContent = defineSsrServeStaticContent(({ app, resolve }) => {
  return ({ urlPath = '/', pathToServe = '.', opts = {} }) => {
    const serveFn = express.static(resolve.public(pathToServe), {
      maxAge,
      // Build files carry a hash in their name (a change is a new file): keep them for good.
      setHeaders: (res, filePath) => {
        if (!process.env.DEV && hashedRE.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      },
      ...opts
    })
    app.use(resolve.urlPath(urlPath), serveFn)
  }
})

const jsRE = /\.js$/
const cssRE = /\.css$/
const woffRE = /\.woff$/
const woff2RE = /\.woff2$/
const gifRE = /\.gif$/
const jpgRE = /\.jpe?g$/
const pngRE = /\.png$/

/**
 * Should return a String with HTML output
 * (if any) for preloading indicated file
 */
export const renderPreloadTag = defineSsrRenderPreloadTag((file/* , { ssrContext } */) => {
  if (jsRE.test(file) === true) {
    return `<link rel="modulepreload" href="${file}" crossorigin>`
  }

  if (cssRE.test(file) === true) {
    return `<link rel="stylesheet" href="${file}" crossorigin>`
  }

  if (woffRE.test(file) === true) {
    return `<link rel="preload" href="${file}" as="font" type="font/woff" crossorigin>`
  }

  if (woff2RE.test(file) === true) {
    return `<link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin>`
  }

  if (gifRE.test(file) === true) {
    return `<link rel="preload" href="${file}" as="image" type="image/gif" crossorigin>`
  }

  if (jpgRE.test(file) === true) {
    return `<link rel="preload" href="${file}" as="image" type="image/jpeg" crossorigin>`
  }

  if (pngRE.test(file) === true) {
    return `<link rel="preload" href="${file}" as="image" type="image/png" crossorigin>`
  }

  return ''
})