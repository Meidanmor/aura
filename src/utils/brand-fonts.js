/**
 * Brand fonts (Store builder → Branding → Brand fonts), from branding.json:
 *
 *   fonts: {
 *     vars:     { text, headings, buttons, cf_…: family or '' },
 *     families: { family: { generic, fallback } },   fallback: a font with Hebrew letters
 *     faces:    [ { family, weight, src, range } ]
 *   }
 *
 * Each brand font becomes a CSS variable, --qf-{key} (app.css uses
 * --qf-text, --qf-headings and --qf-buttons; a block's "Font" uses its own).
 * Published files are the store's own (/brand-fonts/…); the Store builder's
 * live preview sends Google's (fonts.gstatic.com, allowed by the CSP).
 *
 * Everything is checked before it goes into CSS: the config is the store's,
 * but a CSS injection would still be one.
 */

const FAMILY_RE = /^[A-Za-z0-9 ]{1,60}$/
const KEY_RE = /^[a-z][a-z0-9_]{0,23}$/i
const WEIGHT_RE = /^[1-9]00( [1-9]00)?$/
const RANGE_RE = /^[Uu]\+[0-9A-Fa-fUu?+, -]{1,4000}$/
const LOCAL_SRC_RE = /^\/brand-fonts\/[a-z0-9._-]+\.woff2$/
const REMOTE_SRC_RE = /^https:\/\/fonts\.gstatic\.com\/[A-Za-z0-9/._-]+\.woff2$/
const GENERICS = new Set(['serif', 'sans-serif', 'cursive', 'monospace'])

// The text font of a store without its own (app.css's --qf-text). The app's own
// files, only put on the page when something can use them.
const ROBOTO = { 400: 'regular', 200: '200', 500: '500', 600: '600' }
const robotoSrc = (weight) => `/fonts/roboto/roboto-v50-latin-${ROBOTO[weight]}.woff2`
const ROBOTO_CSS = Object.keys(ROBOTO)
  .map((weight) => `@font-face{font-family:Roboto;font-style:normal;font-weight:${weight};font-display:optional;src:url(${robotoSrc(weight)}) format("woff2")}`)
  .join('')

const quote = (family) => `"${family}"`

/** Whether the store chose a text font (then Roboto is never drawn). */
const hasOwnTextFont = (fonts) => FAMILY_RE.test(fonts?.vars?.text || '')

/** The font stack for a family: it, then its Hebrew fallback, then the generic. */
function stack(family, families) {
  const info = families[family] || {}
  const parts = [quote(family)]
  if (FAMILY_RE.test(info.fallback || '')) parts.push(quote(info.fallback))
  parts.push(GENERICS.has(info.generic) ? info.generic : 'sans-serif')
  return parts.join(',')
}

/**
 * The CSS for a branding.json `fonts`: @font-face rules and the variables,
 * and Roboto's rules while no text font is chosen (also with no `fonts`).
 * `remote`: files may come from fonts.gstatic.com (the live preview only).
 * `url`: maps a published path to where it's loaded from (the native app).
 */
export function brandFontsCss(fonts, { remote = false, url = (src) => src } = {}) {
  const roboto = hasOwnTextFont(fonts) ? '' : ROBOTO_CSS
  if (!fonts || typeof fonts !== 'object') return roboto
  const vars = fonts.vars && typeof fonts.vars === 'object' ? fonts.vars : {}
  const families = fonts.families && typeof fonts.families === 'object' ? fonts.families : {}

  const faces = (Array.isArray(fonts.faces) ? fonts.faces : [])
    .filter((f) => f && FAMILY_RE.test(f.family || '') && WEIGHT_RE.test(String(f.weight || '')) && RANGE_RE.test(f.range || '')
      && (LOCAL_SRC_RE.test(f.src || '') || (remote && REMOTE_SRC_RE.test(f.src || ''))))
    .map((f) => `@font-face{font-family:${quote(f.family)};font-style:normal;font-weight:${f.weight};font-display:swap;src:url(${url(f.src)}) format("woff2");unicode-range:${f.range}}`)

  const decls = []
  for (const [key, family] of Object.entries(vars)) {
    if (!KEY_RE.test(key)) continue
    if (family && FAMILY_RE.test(family)) {
      decls.push(`--qf-${key}:${stack(family, families)};`)
    } else if (family === '' && key.startsWith('cf_')) {
      // An own font with no font chosen: the text font.
      decls.push(`--qf-${key}:var(--qf-text);`)
    }
    // Text, headings and buttons left empty keep app.css's defaults.
  }

  // html:root outranks app.css's defaults wherever this ends up in the page.
  return roboto + faces.join('') + (decls.length ? `html:root{${decls.join('')}}` : '')
}

/**
 * The files worth preloading: the text and headings fonts, in the page's
 * alphabet (Hebrew pages: hebrew; others: latin). At most two. Without a
 * text font: Roboto's regular and medium on pages that aren't Hebrew (it has
 * no Hebrew letters; an "optional" font that comes late isn't drawn at all).
 */
export function brandFontPreloads(fonts, lang) {
  const out = []
  const roboto = !hasOwnTextFont(fonts) && lang !== 'he'
  if (roboto) out.push(robotoSrc(400))
  if (fonts && Array.isArray(fonts.faces) && fonts.vars) addBrandPreloads(fonts, lang, out)
  if (roboto && out.length < 2) out.push(robotoSrc(500))
  return out
}

function addBrandPreloads(fonts, lang, out) {
  const subset = lang === 'he' ? /\bU\+0590/i : /^U\+0000-00FF/i
  // Whether a face draws this weight ("300 800" is a variable font's range).
  const covers = (face, weight) => {
    const [lo, hi = lo] = String(face.weight).split(' ').map(Number)
    return weight >= lo && weight <= hi
  }
  const fileFor = (family, weight) => fonts.faces.find((f) => f.family === family && subset.test(f.range || '') && LOCAL_SRC_RE.test(f.src || '') && covers(f, weight))
  for (const [key, weight] of [['text', 400], ['headings', 600]]) {
    const family = fonts.vars[key] || (key === 'headings' ? fonts.vars.text : '')
    if (!family) continue
    // A Hebrew page draws a font without Hebrew letters with its fallback.
    const face = fileFor(family, weight) || fileFor(fonts.families?.[family]?.fallback, weight)
    if (face && !out.includes(face.src)) out.push(face.src)
  }
}

/** A block's "Font": the brand font's variable, falling back to the item's default. */
export function brandFontVar(key, fallbackKey) {
  if (!key || !KEY_RE.test(key)) return undefined
  return `var(--qf-${key}, var(--qf-${fallbackKey}))`
}

/** Puts the fonts on the page (the live preview, and the native app, which has no server render). */
export function applyBrandFonts(fonts, options) {
  if (typeof document === 'undefined') return
  let el = document.getElementById('qwoo-fonts')
  const css = brandFontsCss(fonts, options)
  if (!el) {
    if (!css) return
    el = document.createElement('style')
    el.id = 'qwoo-fonts'
    document.head.appendChild(el)
  }
  if (el.textContent !== css) el.textContent = css
}
