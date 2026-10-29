/**
 * Text styles (the Store builder's Font / Size / Weight / Line Height / Color /
 * Letter Spacing / Letter Case
 * groups on a block's Style tab). The store publishes them as plain fields:
 * "{prefix}_font", "{prefix}_size"… or older names (a block passes them in
 * `keys`). Only what's set is applied, so a block's own look stays the default.
 *
 *   textStyle()  for the element that shows the text: { class, style } to
 *                v-bind. Font, weight and color are inline; sizes and line
 *                heights per screen size use the ts-sz-* / ts-lh-* classes in
 *                app.css (--ts-size, --ts-size-t, --ts-size-m).
 *   textVars()   for text drawn inside other components (Quasar fields, cards):
 *                CSS variables --ts-{name}-font|weight|color|size|lh|case|ls and classes
 *                ts-{name}-font… that the block's own CSS reads.
 */
import { brandFontVar } from './brand-fonts.js'
import { resolveGlobalColor } from './resolve-global-color.js'
import { asResponsive, toCssLength } from 'src/composables/useSectionStyle.js'

const SUFFIX = { desktop: '', tablet: '-t', mobile: '-m' }
const DEVICE = { desktop: 'd', tablet: 't', mobile: 'm' }
const WEIGHT_RE = /^[1-9]00$/
const CASES = new Set(['uppercase', 'lowercase', 'capitalize'])
// A line height may be unitless (1.6): numbers stay numbers.
const lineHeight = (v) => (v === '' || v == null ? null : String(v).trim())

/**
 * A per-screen value as the page needs it: `vars` only where a screen size
 * differs from the bigger one (the CSS falls back to the bigger screen's
 * variable), `has` on every size that has a value, its own or inherited
 * (an empty smaller screen means "same as the bigger one", as the dashboard says).
 */
function cascade(map) {
  const vars = {}
  const has = {}
  let bigger = null
  for (const device of Object.keys(SUFFIX)) {
    const v = map[device] ?? null
    if (v !== null && v !== bigger) vars[device] = v
    if (v !== null) bigger = v
    if (bigger !== null) has[device] = true
  }
  return { vars, has }
}

/** The data keys of a text style: "{prefix}_{part}", or the older names in `over`. */
export function tsKeys(prefix, over = {}) {
  return { font: `${prefix}_font`, size: `${prefix}_size`, weight: `${prefix}_weight`, lh: `${prefix}_line_height`, color: `${prefix}_color`, spacing: `${prefix}_spacing`, textCase: `${prefix}_case`, ...over }
}

function parts(d, keys, defaultFont) {
  const out = { sizes: {}, lhs: {}, spacings: {} }
  if (keys.font) out.font = brandFontVar(d[keys.font], defaultFont)
  if (keys.weight && WEIGHT_RE.test(String(d[keys.weight] ?? ''))) out.weight = String(d[keys.weight])
  if (keys.color) out.color = resolveGlobalColor(d[keys.color]) || undefined
  if (keys.textCase && CASES.has(d[keys.textCase])) out.textCase = d[keys.textCase]
  for (const [part, map, transform] of [['size', 'sizes', toCssLength], ['lh', 'lhs', lineHeight], ['spacing', 'spacings', toCssLength]]) {
    if (!keys[part]) continue
    const r = asResponsive(d[keys[part]])
    for (const device of Object.keys(SUFFIX)) {
      const v = transform(r[device])
      if (v) out[map][device] = v
    }
  }
  return out
}

/** v-bind on the text's own element. */
export function textStyle(d, keys, defaultFont = 'text') {
  const p = parts(d || {}, keys, defaultFont)
  const style = {}
  const cls = {}
  if (p.font) style.fontFamily = p.font
  if (p.weight) style.fontWeight = p.weight
  if (p.color) style.color = p.color
  if (p.textCase) style.textTransform = p.textCase
  for (const [map, varName, clsName] of [[p.sizes, '--ts-size', 'ts-sz'], [p.lhs, '--ts-lh', 'ts-lh'], [p.spacings, '--ts-ls', 'ts-ls']]) {
    const c = cascade(map)
    for (const [device, v] of Object.entries(c.vars)) style[`${varName}${SUFFIX[device]}`] = v
    for (const device of Object.keys(c.has)) cls[`${clsName}-${DEVICE[device]}`] = true
  }
  return { class: cls, style }
}

/** v-bind on a wrapper: variables for text drawn deeper down (the block's CSS uses them). */
export function textVars(d, keys, defaultFont, name) {
  const p = parts(d || {}, keys, defaultFont)
  const style = {}
  const cls = {}
  const set = (part, v) => {
    style[`--ts-${name}-${part}`] = v
    cls[`ts-${name}-${part}`] = true
  }
  if (p.font) set('font', p.font)
  if (p.weight) set('weight', p.weight)
  if (p.color) set('color', p.color)
  if (p.textCase) set('case', p.textCase)
  for (const [map, part, short] of [[p.sizes, 'size', 'sz'], [p.lhs, 'lh', 'lh'], [p.spacings, 'ls', 'ls']]) {
    const c = cascade(map)
    for (const [device, v] of Object.entries(c.vars)) style[`--ts-${name}-${part}${SUFFIX[device]}`] = v
    for (const device of Object.keys(c.has)) cls[`ts-${name}-${short}-${DEVICE[device]}`] = true
  }
  return { class: cls, style }
}

/** Several v-bind objects as one (classes and styles merged). */
export function mergeBinds(...binds) {
  return binds.reduce((acc, b) => ({ class: { ...acc.class, ...(b?.class || {}) }, style: { ...acc.style, ...(b?.style || {}) } }), { class: {}, style: {} })
}
