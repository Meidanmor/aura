/**
 * The page's language: t() / tn() in every template, useI18n() in scripts,
 * and Quasar's own texts and direction (right-to-left for Hebrew). On pages
 * of an extra language, requests to the store say which (X-Qwoo-Lang), so
 * products, categories and posts come back in it.
 */
import { defineBoot } from '#q-app/wrappers'
import { Lang } from 'quasar'
import { createI18n, loadDictionary, setDefaultI18n } from 'src/i18n/index.js'
import { currentLang, isExtraLang } from 'src/i18n/lang.js'

/** In the browser: the store's API answers in the page's language. */
function sendLanguage(lang) {
  const original = window.fetch.bind(window)
  window.fetch = (input, init) => {
    try {
      const url = new URL(input instanceof Request ? input.url : String(input), window.location.href)
      if (url.origin === window.location.origin && url.pathname.startsWith('/wp-json/')) {
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined))
        headers.set('X-Qwoo-Lang', lang)
        return original(input, { ...init, headers })
      }
    } catch {
      // not a URL we know: sent as it is
    }
    return original(input, init)
  }
}

export default defineBoot(async ({ app, ssrContext }) => {
  const lang = currentLang()
  const i18n = createI18n(lang, await loadDictionary(lang))
  app.provide('i18n', i18n)
  app.config.globalProperties.t = i18n.t
  app.config.globalProperties.tn = i18n.tn
  setDefaultI18n(i18n)
  if (!ssrContext && isExtraLang(lang)) sendLanguage(lang)
  if (lang === 'he') {
    const he = (await import('quasar/lang/he.js')).default
    Lang.set(he, ssrContext)
  }
})
