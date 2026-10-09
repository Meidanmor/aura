/**
 * The storefront's languages. Text is written in English and looked up by
 * that English text, so a missing translation shows the English.
 *
 *   t('Add to cart')                          → "הוספה לעגלה"
 *   t('{n} in stock', { n: 3 })
 *   tn('{n} item', '{n} items', count)        → the form for count
 *
 * The store's language comes from config/languages.json, read at build time
 * (quasar.config.js → process.env.QWOO_LANGUAGES), so the server and the
 * browser always render the same text. The boot file (boot/i18n.js) makes
 * t() and tn() available in every template, and useI18n() in scripts.
 */
import { inject } from 'vue'

export const LANGUAGES = {
  en: { name: 'English', dir: 'ltr', locale: 'en-US' },
  he: { name: 'עברית', dir: 'rtl', locale: 'he-IL' },
}

/** { main, extra, prefixes } from the build (main: the store's language). */
export function storeLanguages() {
  let parsed = {}
  try {
    parsed = JSON.parse(process.env.QWOO_LANGUAGES || '{}') || {}
  } catch {
    parsed = {}
  }
  const main = LANGUAGES[parsed.main] ? parsed.main : 'en'
  return { main, extra: Array.isArray(parsed.extra) ? parsed.extra.filter((c) => LANGUAGES[c] && c !== main) : [], prefixes: parsed.prefixes || {} }
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

/** For code outside components (stores, utils): the app's i18n, set by the boot file. */
export function setDefaultI18n(i18n) {
  fallback = i18n
}

/** In a component's setup: { t, tn, lang, dir, locale }. */
export function useI18n() {
  return inject('i18n', null) || fallback
}

/** Outside components. */
export const t = (text, params) => fallback.t(text, params)
export const tn = (one, other, n, params) => fallback.tn(one, other, n, params)
export const currentLocale = () => fallback.locale
