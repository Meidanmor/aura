/**
 * The storefront's languages. Text is written in English and looked up by
 * that English text, so a missing translation shows the English.
 *
 *   t('Add to cart')                          → "הוספה לעגלה"
 *   t('{n} in stock', { n: 3 })
 *   tn('{n} item', '{n} items', count)        → the form for count
 *
 * The store's languages come from config/languages.json: the published
 * version the server runs with (src-ssr/site-content.js, passed to the
 * browser in window.__QWOO_SITE__), else the one built in
 * (process.env.QWOO_LANGUAGES), so the server and the browser always render
 * the same text. Each page is in one of them (main, or
 * an extra language under its prefix: see lang.js). The boot file
 * (boot/i18n.js) makes t() and tn() available in every template, and
 * useI18n() in scripts.
 */
import { inject } from 'vue'

export const LANGUAGES = {
  en: { name: 'English', dir: 'ltr', locale: 'en-US' },
  he: { name: 'עברית', dir: 'rtl', locale: 'he-IL' },
}

let builtIn = null
let lastSource = null
let lastLanguages = null

/** { main, extra, prefixes } (main: the store's language). */
export function storeLanguages() {
  const live = typeof window === 'undefined' ? globalThis.__QWOO_SITE?.languages : window.__QWOO_SITE__?.languages
  let source = live
  if (!source || typeof source !== 'object') {
    if (!builtIn) {
      try {
        builtIn = JSON.parse(process.env.QWOO_LANGUAGES || '{}') || {}
      } catch {
        builtIn = {}
      }
    }
    source = builtIn
  }
  // Asked for on every link: worked out once per published version.
  if (source !== lastSource) {
    const main = LANGUAGES[source.main] ? source.main : 'en'
    lastLanguages = {
      main,
      extra: Array.isArray(source.extra) ? source.extra.filter((c) => LANGUAGES[c] && c !== main) : [],
      prefixes: source.prefixes && typeof source.prefixes === 'object' ? source.prefixes : {},
    }
    lastSource = source
  }
  return lastLanguages
}

const fill = (text, params) => (params ? String(text).replace(/\{(\w+)\}/g, (m, k) => (params[k] ?? params[k] === 0 ? String(params[k]) : m)) : String(text))

/** An i18n object for one language and its dictionary (English text → translation; arrays are [one, many]). */
export function createI18n(code, dict = {}) {
  const meta = LANGUAGES[code] || LANGUAGES.en
  let patterns = null
  const fromPattern = (text) => {
    if (!patterns) {
      patterns = []
      for (const [key, out] of Object.entries(dict)) {
        if (!key.includes('{') || typeof out !== 'string') continue
        const names = []
        const re = key.split(/(\{\w+\})/).map((part) => {
          const m = part.match(/^\{(\w+)\}$/)
          if (m) {
            names.push(m[1])
            return '(.+?)'
          }
          return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        }).join('')
        patterns.push({ re: new RegExp(`^${re}$`, 's'), names, out })
      }
    }
    for (const p of patterns) {
      const m = text.match(p.re)
      if (m) return fill(p.out, Object.fromEntries(p.names.map((n, i) => [n, m[i + 1]])))
    }
    return null
  }

  function t(text, params) {
    if (text == null || text === '') return ''
    const key = String(text)
    let out = dict[key]
    if (Array.isArray(out)) out = out[1] ?? out[0]
    // Messages from the store (English) with a name or number in them.
    if (out == null) out = (!params && code !== 'en' && fromPattern(key)) || key
    return fill(out, params)
  }

  function tn(one, other, n, params = {}) {
    const all = { n, ...params }
    const entry = dict[one]
    if (Array.isArray(entry)) return fill(n === 1 ? entry[0] : entry[1] ?? entry[0], all)
    return fill(n === 1 ? entry ?? one : dict[other] ?? other, all)
  }

  return { lang: code, dir: meta.dir, locale: meta.locale, t, tn }
}

/** The dictionary of a language ({} for English). */
export async function loadDictionary(code) {
  if (code === 'he') return (await import('./he.js')).default
  return {}
}

const english = createI18n('en')
let fallback = english

/**
 * For code outside components (stores, utils): the app's i18n, set by the
 * boot file. On the server each request has its own (requests in different
 * languages render at the same time), kept in the request's store.
 */
export function setDefaultI18n(i18n) {
  const store = typeof window === 'undefined' ? globalThis.__QWOO_LANG_ALS?.getStore() : null
  if (store) store.i18n = i18n
  else fallback = i18n
}
const active = () => (typeof window === 'undefined' && globalThis.__QWOO_LANG_ALS?.getStore()?.i18n) || fallback

/** In a component's setup: { t, tn, lang, dir, locale }. */
export function useI18n() {
  return inject('i18n', null) || active()
}

/** Outside components. */
export const t = (text, params) => active().t(text, params)
export const tn = (one, other, n, params) => active().tn(one, other, n, params)
export const currentLocale = () => active().locale
