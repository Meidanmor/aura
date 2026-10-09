/**
 * The visitor's language choice (from the switcher or the "also in" bar),
 * kept in this browser only. Storage can be off (private windows): then the
 * bar simply shows again next time.
 */
const KEY = 'qwoo-language'

export function rememberLanguage(code) {
  try {
    localStorage.setItem(KEY, code)
  } catch {
    // storage blocked
  }
}

export function chosenLanguage() {
  try {
    return localStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}
