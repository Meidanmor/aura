/**
 * The text colour that reads on a given background: near-black on light colours, white on dark ones.
 * Quasar puts white text on its colour classes (a q-btn color="secondary" is "bg-secondary text-white"),
 * which vanished on stores whose main colour is light (dark stores: the ink colour is cream). The store's
 * colours get matching --q-on-<name> variables (render.js siteHead, MainLayout applyGlobalColors) and
 * app.css swaps text-white for them.
 */
const DARK_INK = '#111111'
const LIGHT_INK = '#ffffff'

function rgbOf(value) {
  const v = String(value || '').trim()
  let m = v.match(/^#([0-9a-f]{3,4})$/i)
  if (m) return m[1].slice(0, 3).split('').map((c) => parseInt(c + c, 16))
  m = v.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i)
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16))
  m = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i)
  if (m) return [+m[1], +m[2], +m[3]]
  return null
}

function luminance([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** '#111111' or '#ffffff' (whichever has more contrast); '' when the colour can't be read. */
export function onColor(value) {
  const rgb = rgbOf(value)
  if (!rgb) return ''
  const l = luminance(rgb)
  const withWhite = 1.05 / (l + 0.05)
  const withDark = (l + 0.05) / (luminance(rgbOf(DARK_INK)) + 0.05)
  return withDark > withWhite ? DARK_INK : LIGHT_INK
}

/** The contrast ratio of two colours (1 to 21); 21 when either can't be read, so callers keep the colour. */
export function contrast(a, b) {
  const x = rgbOf(a)
  const y = rgbOf(b)
  if (!x || !y) return 21
  const [hi, lo] = [luminance(x), luminance(y)].sort((m, n) => n - m)
  return (hi + 0.05) / (lo + 0.05)
}

/** The store colours that get an --q-on-<name> variable. */
export const ON_COLORS = ['primary', 'secondary', 'accent']

/**
 * Readable text on a colour as the Store builder saves it: "global:secondary" → var(--q-on-secondary),
 * a hex → onColor(); '' when unknown (callers keep their old fallback). 2026-11-26.
 */
export function inkOn(value) {
  const m = typeof value === 'string' && value.match(/^global:([a-z]+)$/)
  if (m) return ON_COLORS.includes(m[1]) ? `var(--q-on-${m[1]})` : ''
  return onColor(value)
}
