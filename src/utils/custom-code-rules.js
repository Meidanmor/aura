// Tracking & custom code (dashboard → Settings → Tracking & code): the rules
// the server and the browser share. The store sends every snippet that isn't
// off (src-ssr/custom-code.js); these decide which ones run on a page, for
// which shopper. No DOM here.

import { chromeMatch } from 'src/utils/layouts.js'

export const CONSENT_COOKIE = 'qwoo_consent'
/** Groups the shopper chooses (necessary always runs). */
export const GROUPS = ['analytics', 'marketing']

/**
 * The shopper's choice from the qwoo_consent cookie ("1.a1.m0"), or null when
 * they haven't chosen yet.
 */
export function parseConsent(value, version = 1) {
  const m = /^1\.a([01])\.m([01])(?:\.(\d+)(?:\.(\d+)(?:\.([A-Z0-9]{4}-[A-Z0-9]{4}))?)?)?/.exec(String(value || ''))
  if (!m) return null
  // A choice made under an older banner version ("Ask everyone again" in the dashboard) counts as none.
  const v = Number(m[4] || 1)
  if (v < (Number(version) || 1)) return null
  return { analytics: m[1] === '1', marketing: m[2] === '1', v, cid: m[5] || '' }
}

/** "1.a1.m0.<time>.<banner version>.<choice ID>" (older cookies end after the time: version 1, no ID). */
export const formatConsent = (choice) => `1.a${choice.analytics ? 1 : 0}.m${choice.marketing ? 1 : 0}.${Math.floor(Date.now() / 1000)}.${choice.v || 1}${choice.cid ? '.' + choice.cid : ''}`

/**
 * What runs for this shopper: their choice, else the store's default (Ask
 * first: nothing until they agree; Notice only: everything until they say no).
 */
export function allowedGroups(mode, choice) {
  if (choice) return { necessary: true, analytics: !!choice.analytics, marketing: !!choice.marketing }
  const yes = mode === 'notice'
  return { necessary: true, analytics: yes, marketing: yes }
}

/** Whether a snippet runs on this page (where: chromeTarget()). */
export function onPage(snippet, where) {
  if (snippet.where === 'all') return true
  const hit = chromeMatch({ targets: snippet.targets || [], page_paths: snippet.page_paths || [] }, where)
  return snippet.where === 'only' ? hit : !hit
}

/** The snippets this browser may run at all (Testing ones only in the test browser). */
export const forBrowser = (snippets, testing) => (snippets || []).filter((s) => s.state === 'live' || (testing && s.state === 'testing'))

/** Whether this store needs to ask (anything beyond necessary). */
export const needsConsent = (snippets) => snippets.some((s) => s.group !== 'necessary')
