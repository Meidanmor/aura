/**
 * Text styles (the Store builder's Font / Size / Weight / Line Height / Color
 * groups on a block's Style tab). The store publishes them as plain fields:
 * "{prefix}_font", "{prefix}_size"… or older names (a block passes them in
 * `keys`). Only what's set is applied, so a block's own look stays the default.
 *
 *   textStyle()  for the element that shows the text: { class, style } to
 *                v-bind. Font, weight and color are inline; sizes and line
 *                heights per screen size use the ts-sz-* / ts-lh-* classes in
 *                app.css (--ts-size, --ts-size-t, --ts-size-m).
 *   textVars()   for text drawn inside other components (Quasar fields, cards):
 *                CSS variables --ts-{name}-font|weight|color|size|lh and classes
 *                ts-{name}-font… that the block's own CSS reads.
 */
import { brandFontVar } from './brand-fonts.js'
import { resolveGlobalColor } from './resolve-global-color.js'
import { asResponsive, toCssLength } from 'src/composables/useSectionStyle.js'

const SUFFIX = { desktop: '', tablet: '-t', mobile: '-m' }
const DEVICE = { desktop: 'd', tablet: 't', mobile: 'm' }
const WEIGHT_RE = /^[1-9]00$/
// A line height may be unitless (1.6): numbers stay numbers.
const lineHeight = (v) => (v === '' || v == null ? null : String(v).trim())

/** The data keys of a text style: "{prefix}_{part}", or the older names in `over`. */
export function tsKeys(prefix, over = {}) {
  return { font: `${prefix}_font`, size: `${prefix}_size`, weight: `${prefix}_weight`, lh: `${prefix}_line_height`, color: `${prefix}_color`, ...over }
}

function parts(d, keys, defaultFont) {
  const out = { sizes: {}, lhs: {} }
  if (keys.font) out.font = brandFontVar(d[keys.font], defaultFont)
  if (keys.weight && WEIGHT_RE.test(String(d[keys.weight] ?? ''))) out.weight = String(d[keys.weight])
  if (keys.color) out.color = resolveGlobalColor(d[keys.color]) || undefined
  for (const [part, map, transform] of [['size', 'sizes', toCssLength], ['lh', 'lhs', lineHeight]]) {
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
  for (const [device, v] of Object.entries(p.sizes)) {
    style[`--ts-size${SUFFIX[device]}`] = v
    cls[`ts-sz-${DEVICE[device]}`] = true
  }
  for (const [device, v] of Object.entries(p.lhs)) {
    style[`--ts-lh${SUFFIX[device]}`] = v
    cls[`ts-lh-${DEVICE[device]}`] = true
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
  for (const [device, v] of Object.entries(p.sizes)) {
    style[`--ts-${name}-size${SUFFIX[device]}`] = v
    cls[`ts-${name}-sz-${DEVICE[device]}`] = true
  }
  for (const [device, v] of Object.entries(p.lhs)) {
    style[`--ts-${name}-lh${SUFFIX[device]}`] = v
    cls[`ts-${name}-lh-${DEVICE[device]}`] = true
  }
  return { class: cls, style }
}

/** Several v-bind objects as one (classes and styles merged). */
export function mergeBinds(...binds) {
  return binds.reduce((acc, b) => ({ class: { ...acc.class, ...(b?.class || {}) }, style: { ...acc.style, ...(b?.style || {}) } }), { class: {}, style: {} })
}
