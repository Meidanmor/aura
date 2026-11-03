/**
 * The header, footer and branding configs every page carries for the browser
 * (window.__BRAND_CONFIG__, __HEADER_CONFIG__, __FOOTER_CONFIG__). They are
 * the same on every page of a language, so instead of repeating them inside
 * each page (~64 KB raw, ~13 KB gzipped on a typical store), the page links
 * one small script, /__site/s/{version}/{lang}.js, that the browser and the
 * CDN keep for good: a publish makes a new version, so a new address.
 *
 * The script is made from the live version in memory (site-content.js), the
 * same place the server render reads them from, so publishing still shows
 * within seconds, with no build. render.js only links it when its contents are
 * exactly what the page was rendered with; otherwise the page carries them
 * inline as before. If the script can't be loaded, src/boot/shared-state.js
 * fetches the configs before the app starts.
 */
import { isExtraLang } from '../src/i18n/lang.js'

/** The window globals the script sets, by their render.js state key. */
export const SHARED_KEYS = { brandConfig: '__BRAND_CONFIG__', headerConfig: '__HEADER_CONFIG__', footerConfig: '__FOOTER_CONFIG__' }

/** A value as render.js writes it into a <script> (no "</script>" can end it early). */
export const stateJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c')

/** The logo address as MainLayout's preFetch sets it (resolveHeroImageSrc) when the config says where it is. */
const LOGO_PATH_RE = /^\/(homepage-hero|branding)\/[^/]+$/

const cache = new Map() // `${version}|${lang}` -> { json, script } | null

/**
 * What the shared script holds for a version and language: { json: { brandConfig: '…', … },
 * script }, or null when it can't be known without rendering (an older config whose logo
 * address is looked up by file name).
 */
export function sharedState(site, lang) {
    if (!site?.version || !lang) return null
    const key = `${site.version}|${lang}`
    if (cache.has(key)) return cache.get(key)

    // As loadPageConfig() reads them on the server (src/utils/config-loader.js).
    const file = (name) => {
        const data = site.json[`config/${name}.json`]
        return data && typeof data === 'object' ? data : {}
    }
    const own = (page) => {
        if (!isExtraLang(lang)) return file(page)
        const data = file(`${lang}/${page}`)
        return Object.keys(data).length ? data : file(page)
    }

    let state = null
    const brand = { ...file('branding') }
    let logoKnown = true
    if (!brand.logo) brand.logo = ''
    else if (typeof brand.logo_path === 'string' && LOGO_PATH_RE.test(brand.logo_path)) brand.logo = brand.logo_path
    else logoKnown = false

    if (logoKnown) {
        const values = { brandConfig: brand, headerConfig: own('header'), footerConfig: own('footer') }
        const json = {}
        for (const name of Object.keys(SHARED_KEYS)) json[name] = stateJson(values[name])
        const script = Object.entries(SHARED_KEYS).map(([name, global]) => `window.${global} = ${json[name]};`).join('\n') + '\n'
        state = { json, script }
    }

    // Only the live version's entries are worth keeping.
    for (const k of cache.keys()) if (!k.startsWith(`${site.version}|`)) cache.delete(k)
    cache.set(key, state)
    return state
}

/** The shared script's address for a page. */
export const sharedScriptPath = (site, lang) => `/__site/s/${site.version}/${encodeURIComponent(lang)}.js`
