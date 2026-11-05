/**
 * Where this visit came from, sent with the checkout so Analytics can count an
 * order to its channel. Only for this visit: kept in sessionStorage, no cookie,
 * nothing about the person. Visit counts themselves come from the owner's GA4.
 */
const KEY = 'qwoo_source'
const SEARCH = /(^|\.)(google|bing|yahoo|duckduckgo|yandex|baidu)\./
const SOCIAL = /(^|\.)(facebook|fb|instagram|tiktok|twitter|x|linkedin|pinterest|youtube|t|whatsapp|wa)\.[a-z]/

const cut = (value, max) => String(value || '').slice(0, max)

/** On the first page of a visit. A new campaign link in the same visit replaces it. */
export function rememberSource() {
  if (typeof window === 'undefined') return
  try {
    const q = new URLSearchParams(window.location.search)
    const source = q.get('utm_source')
    if (source) {
      sessionStorage.setItem(KEY, JSON.stringify({ source: cut(source, 60), medium: cut(q.get('utm_medium'), 60), campaign: cut(q.get('utm_campaign'), 100) }))
      return
    }
    if (sessionStorage.getItem(KEY) || !document.referrer) return
    const host = new URL(document.referrer).hostname.replace(/^www\./, '')
    if (!host || host === window.location.hostname.replace(/^www\./, '')) return
    const medium = SEARCH.test(host) ? 'organic' : SOCIAL.test(host) ? 'social' : 'referral'
    sessionStorage.setItem(KEY, JSON.stringify({ source: cut(host, 60), medium, campaign: '' }))
  } catch { /* storage blocked: the order counts as direct */ }
}

/** { source, medium, campaign }, or {} for a direct visit. */
export function currentSource() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '{}') || {}
  } catch {
    return {}
  }
}
