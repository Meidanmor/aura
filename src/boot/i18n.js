/**
 * The storefront's language: t() / tn() in every template, useI18n() in
 * scripts, and Quasar's own texts and direction (right-to-left for Hebrew).
 */
import { defineBoot } from '#q-app/wrappers'
import { Lang } from 'quasar'
import { createI18n, loadDictionary, setDefaultI18n, storeLanguages } from 'src/i18n/index.js'

export default defineBoot(async ({ app, ssrContext }) => {
  const { main } = storeLanguages()
  const i18n = createI18n(main, await loadDictionary(main))
  app.provide('i18n', i18n)
  app.config.globalProperties.t = i18n.t
  app.config.globalProperties.tn = i18n.tn
  setDefaultI18n(i18n)
  if (main === 'he') {
    const he = (await import('quasar/lang/he.js')).default
    Lang.set(he, ssrContext)
  }
})
