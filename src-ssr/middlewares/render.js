// ssr-src/middlewares/render.js
import { defineSsrMiddleware } from '#q-app/wrappers'
import { randomBytes } from 'crypto'
import branding from '../../public/config/branding.json' // adjust path as needed


const WP_BACKEND_URL = process.env.WP_BACKEND_URL || ''

// The only origins ever allowed to embed this site in an iframe: the WP
// backend itself and, optionally, the store platform's owner dashboard
// (QWOO_EDITOR_ORIGIN). Derived once from server config, never trusted from
// the request — a client-supplied admin_origin query param is only ever used
// to CHECK AGAINST these, never to set the policy directly.
const EDITOR_ORIGINS = [WP_BACKEND_URL, process.env.QWOO_EDITOR_ORIGIN || ''].map((value) => {
    try {
        return value ? new URL(value).origin : ''
    } catch (err) {
        console.warn('[render] Not a valid URL — live-preview framing stays disabled for it:', value + err)
        return ''
    }
}).filter(Boolean)

const isIgnoredRequest = (url) => {
    return (
        url.startsWith('/.well-known') ||
        url.includes('devtools') ||
        url.endsWith('.map')
    )
}

const plainText = (html = '') => String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

// Store API prices are in the currency's minor unit ("4550" = 45.50).
const money = (amount, prices) => {
    const unit = Number(prices?.currency_minor_unit ?? 2)
    const value = Number(amount)
    return Number.isFinite(value) ? (value / 10 ** unit).toFixed(unit) : undefined
}

/**
 * schema.org data for the page being rendered: the store (homepage), the
 * product with its price and stock, and the breadcrumb trail. Google uses
 * these for rich results (price, availability, breadcrumbs under the title).
 */
function structuredData(ssrContext, req) {
    const seo = ssrContext.seoData || {}
    const origin = seo.canonical ? new URL(seo.canonical).origin : `https://${req.headers.host}`
    const home = `${origin}/`
    const out = []
    const crumb = (items) => ({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: item.url })),
    })

    if (seo.type === 'home') {
        out.push({ '@context': 'https://schema.org', '@type': 'WebSite', name: seo.site_name || seo.title, url: home })
        out.push({ '@context': 'https://schema.org', '@type': 'Organization', name: seo.site_name || seo.title, url: home, ...(seo.og_image ? { logo: seo.og_image } : {}) })
    }

    const product = ssrContext.productData
    if (product?.id) {
        const prices = product.prices || {}
        const url = seo.canonical || `${origin}/product/${product.slug}`
        const range = prices.price_range
        const availability = product.is_in_stock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock'
        const offers = range && range.min_amount !== range.max_amount
            ? { '@type': 'AggregateOffer', priceCurrency: prices.currency_code, lowPrice: money(range.min_amount, prices), highPrice: money(range.max_amount, prices), offerCount: product.variations?.length || undefined, availability }
            : { '@type': 'Offer', priceCurrency: prices.currency_code, price: money(range ? range.min_amount : prices.price, prices), availability, url }
        out.push({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: plainText(product.name),
            description: seo.description || plainText(product.short_description || product.description).slice(0, 5000),
            image: (product.images || []).map((image) => image.src).filter(Boolean),
            ...(product.sku ? { sku: product.sku } : {}),
            url,
            offers,
        })
        const category = product.categories?.[0] || product.extensions?.qwoo?.default_category
        out.push(crumb([
            { name: seo.site_name || 'Home', url: home },
            ...(category?.slug ? [{ name: plainText(category.name), url: `${origin}/product-category/${category.slug}` }] : []),
            { name: plainText(product.name), url },
        ]))
    }

    const category = ssrContext.selectedCategoryData
    if (category?.id && seo.type === 'product_cat') {
        out.push(crumb([
            { name: seo.site_name || 'Home', url: home },
            { name: plainText(category.name), url: seo.canonical || `${origin}/product-category/${category.slug}` },
        ]))
    }
    return out
}

// *.vercel.app addresses are the deployment's internal address, not the
// store's: keep them out of search engines (the store's own address is the
// canonical one anyway).
const isInternalHost = (host = '') => /\.vercel\.app$/i.test(host.split(':')[0])

export default defineSsrMiddleware(({ app, resolve, render }) => {
    app.get(resolve.urlPath('*'), (req, res) => {
        if (isIgnoredRequest(req.url)) {
            return res.status(404).end()
        }
        const nonce = randomBytes(16).toString('base64')

        const colors = branding.global_colors || {};
        const brandDevFixStyle = process.env.DEV ? `
  <style data-branding-dev-fix>
    :root {
      ${Object.entries(colors).map(([key, value]) => `--q-${key}: ${value} !important;`).join('\n      ')}
    }
  </style>
` : '';

        res.setHeader('Content-Type', 'text/html')

        // Shop Builder's Live Preview panel embeds this site in an iframe
        // from wp-admin (or the platform dashboard) — cross-origin framing,
        // which the default policy below blocks as clickjacking protection.
        // Only relax it for a request that is BOTH flagged as the editor
        // (?qwoo_editor=1) AND whose declared admin_origin exactly matches one
        // of the configured editor origins. Every other request keeps the
        // strict default.
        const editorOrigin = typeof req.query?.admin_origin === 'string' ? req.query.admin_origin : ''
        const isEditorRequest =
            req.query?.qwoo_editor === '1' &&
            EDITOR_ORIGINS.includes(editorOrigin)

        const frameAncestors = isEditorRequest ? `'self' ${editorOrigin}` : "'self'"

        res.setHeader(
            'Content-Security-Policy',
            "default-src 'self'; " +
            `script-src 'self' 'nonce-${nonce}' https://accounts.google.com https://js.stripe.com https://hcaptcha.com https://*.hcaptcha.com; ` +
            "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com; " +
            "img-src 'self' data: https:; " +
            // The dev server's hot-reload websocket only exists locally.
            `connect-src 'self' ${WP_BACKEND_URL ? WP_BACKEND_URL : ''} https://api.stripe.com https://hcaptcha.com https://*.hcaptcha.com${process.env.DEV ? ' ws://localhost:* wss://localhost:*' : ''}; ` +
            "font-src 'self' https://fonts.gstatic.com; " +
            // Videos (Video block + video backgrounds) are uploads served by
            // the WP backend or files on this site — the plugin only accepts
            // "video file URL"s on those hosts. YouTube/Vimeo play in iframes.
            `media-src 'self' ${WP_BACKEND_URL ? WP_BACKEND_URL : ''}; ` +
            // Video embeds: only the two exact player hosts the frontend
            // builds URLs for (privacy-enhanced YouTube + Vimeo).
            "frame-src https://accounts.google.com https://js.stripe.com https://hooks.stripe.com https://hcaptcha.com https://*.hcaptcha.com https://www.youtube-nocookie.com https://player.vimeo.com; " +
            // No plugins (<object>/<embed>), no <base> hijacking, and forms
            // may only submit to this site (the app posts via fetch; Google
            // sign-in and Stripe use redirects / their own iframes).
            "object-src 'none'; " +
            "base-uri 'self'; " +
            "form-action 'self'; " +
            `frame-ancestors ${frameAncestors};`
        )

        // Full URL to same-origin, only the origin to other sites, nothing
        // when going https -> http (the browsers' default, made explicit).
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

        // Browser features the store never uses. `payment` (Stripe Express
        // Checkout / Apple & Google Pay), `fullscreen` and `autoplay` (video
        // embeds) are deliberately NOT restricted.
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), usb=(), browsing-topics=()')

        // Pages that open this site in a popup can't keep a handle on it
        // (blocks cross-window scripting tricks); popups this site opens
        // itself (payment / sign-in windows) keep working.
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')

        // HTTPS only from now on (production; Vercel and Hostinger both
        // serve TLS). No includeSubDomains/preload — those affect other
        // subdomains of the same domain and are hard to undo.
        if (!process.env.DEV) {
            res.setHeader('Strict-Transport-Security', 'max-age=31536000')
        }

        // X-Frame-Options can't express "allow this one other origin" (only
        // DENY / SAMEORIGIN), so it's omitted for a validated editor request
        // and left as SAMEORIGIN for everything else. Modern browsers prefer
        // CSP frame-ancestors over this anyway, but older ones don't, so it
        // must not contradict the CSP set above.
        if (!isEditorRequest) {
            res.setHeader('X-Frame-Options', 'SAMEORIGIN')
        }

        // Prevent MIME-sniffing of responses
        res.setHeader('X-Content-Type-Options', 'nosniff')

        if (isInternalHost(req.headers.host)) {
            res.setHeader('X-Robots-Tag', 'noindex')
        }

        const ssrContext = { req, res }

        render(ssrContext)
            .then(html => {
                // NOTE: html already contains the correct <title>/<meta>/<link>/<script>
                // tags from every useMeta() call in the rendered component tree,
                // injected automatically by Quasar's render() — with the hydration
                // markers the client-side Meta plugin needs to adopt these nodes on
                // navigation. Do NOT strip or replace the <title> here.

                const productData = ssrContext.productData || {}
                const heroData = ssrContext.heroData || {}

                const states = {
                    productData,
                    heroData,
                    brandConfig: ssrContext.brandConfig || [],
                    headerConfig: ssrContext.headerConfig || [],
                    productsData: ssrContext.productsData || [],
                    categoriesData: ssrContext.categoriesData || [],
                    homeProductsData: ssrContext.homeProductsData || [],
                    sectionsData: ssrContext.sectionsData || {},
                    cartArray: ssrContext.cartArray || null,
                    productsTotal: ssrContext.productsTotal || 0,
                    pagesTotal: ssrContext.pagesTotal || 1,
                    pageConfig: ssrContext.pageConfig || {},
                    selectedCategoryData: ssrContext.selectedCategoryData || {},
                    priceMeta: ssrContext.priceMeta || {},
                    ssrQuery: ssrContext.ssrQuery || {},
                    seoData: ssrContext.seoData || null
                }

                // JSON-LD structured data — appended, not replacing anything Quasar produced.
                const schemaHtml = structuredData(ssrContext, req)
                    .map((schema) => `<script type="application/ld+json" nonce="${nonce}">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`)
                    .join('')

                const criticalHeadExtra = `
          ${schemaHtml}
          ${WP_BACKEND_URL ? `<link rel="preconnect" href="${WP_BACKEND_URL}">` : ''}
          ${heroData.src ? `
            <link
              rel="preload"
              as="image"
              href="${heroData.src}"
              ${heroData.srcset ? `imagesrcset="${heroData.srcset}"` : ''}
              ${heroData.sizes ? `imagesizes="${heroData.sizes}"` : ''}
              fetchpriority="high"
            >` : ''}
          <style>
            .hero-section-sec, .lcp-wrapper, .hero-img, .q-layout, .q-page-container, #q-app {
              opacity: 1 !important;
              visibility: visible !important;
              transition: none !important;
              animation: none !important;
            }
          </style>
          ${brandDevFixStyle}
        `

                const bodyBottom = Object.entries(states)
                    .map(([key, value]) => {
                        const globalName = `__${key.replace(/([A-Z])/g, '_$1').toUpperCase()}__`
                        return `<script nonce="${nonce}">window.${globalName} = ${JSON.stringify(value).replace(/</g, '\\u003c')}</script>`
                    })
                    .join('\n')

                const withNonce = html.replace(
                    /<script((?:(?!src=|nonce=)[^>])*)>/g,
                    (match, attrs) => `<script${attrs} nonce="${nonce}">`
                )

                // Append (not replace) — Quasar's own head content stays intact.
                const output = withNonce
                    .replace('</head>', `${criticalHeadExtra}</head>`)
                    .replace('</body>', `${bodyBottom}</body>`)

                res.send(output)
            })
            .catch(err => {
                if (err.url) {
                    if (err.code) res.redirect(err.code, err.url)
                    else res.redirect(err.url)
                } else if (err.code === 404) {
                    res.status(404).send('404 | Page Not Found')
                } else if (process.env.DEV) {
                    console.error('SSR REAL ERROR:', err)
                    console.error(err.stack)
                    res.status(500).send(`<pre style="white-space: pre-wrap; color: red;">${err.stack || err.message}</pre>`)
                } else {
                    res.status(500).send('500 | Internal Server Error')
                    if (process.env.DEBUGGING) console.error(err.stack)
                }
            })
    })
})