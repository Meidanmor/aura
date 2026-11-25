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

/** The store colours that get an --q-on-<name> variable. */
export const ON_COLORS = ['primary', 'secondary', 'accent']
