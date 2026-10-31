/**
 * Google sign-in's `state`: GoogleLoginButton keeps { state, back, time } in this tab's
 * sessionStorage before leaving for Google; /auth/callback takes it once and refuses a code
 * whose state doesn't match (a sign-in this tab never started) or is over 15 minutes old.
 */
export const GOOGLE_STATE_KEY = 'qwoo-google-state'

/** The path to go back to when `state` is this tab's own, else null. Works once. */
export function takeGoogleState (state) {
  let saved = null
  try {
    saved = JSON.parse(sessionStorage.getItem(GOOGLE_STATE_KEY) || 'null')
    sessionStorage.removeItem(GOOGLE_STATE_KEY)
  } catch {
    return null
  }
  if (!saved || typeof saved.state !== 'string' || !state || saved.state !== state) return null
  if (!(Date.now() - Number(saved.time) < 15 * 60 * 1000)) return null
  // Only a path on this store.
  const back = typeof saved.back === 'string' && saved.back.startsWith('/') && !saved.back.startsWith('//') ? saved.back : '/'
  return back
}
