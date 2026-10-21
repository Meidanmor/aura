/**
 * Smaller Store builder configs. Every section and block carries its whole
 * `style` (every field, empty ones and defaults included): ~2 KB each, so a
 * homepage config came to ~200 KB, sent again inside the page's HTML for the
 * browser to read before it can start. This keeps only what changes the look:
 *
 * - empty values ('', null, empty objects; a device map with nothing set),
 * - the background's fields when there's no background (bg_type none),
 * - the shadow's fields when there's no shadow on any screen size.
 *
 * Arrays, numbers and false stay as they are (false can differ from "not
 * set"). Only `style` objects of sections and blocks are changed: their
 * reader (useSectionStyle.js) treats empty and missing alike. Used on the
 * live version once (site-content.js) and on config files read otherwise.
 */

const isEmpty = (v) => v === '' || v == null || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)

function slimValue(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return v
  const out = {}
  for (const [k, x] of Object.entries(v)) {
    const y = slimValue(x)
    if (!isEmpty(y)) out[k] = y
  }
  return out
}

const anyOn = (screens) => !!screens && typeof screens === 'object' && Object.values(screens).some(Boolean)

export function slimStyle(style) {
  if (!style || typeof style !== 'object' || Array.isArray(style)) return style
  const screens = style._screens && typeof style._screens === 'object' ? style._screens : {}
  const noBg = (!style.bg_type || style.bg_type === 'none') && !anyOn(screens.bg_type)
  const noShadow = !style.shadow && !anyOn(screens.shadow)
  const out = {}
  for (const [k, v] of Object.entries(style)) {
    if (noBg && k.startsWith('bg_') && k !== 'bg_type') continue
    if (noShadow && k.startsWith('shadow_')) continue
    const y = slimValue(v)
    if (!isEmpty(y)) out[k] = y
  }
  return out
}

/** A config file's content, with every section's and block's style slimmed (a new object). */
export function slimConfig(node) {
  if (Array.isArray(node)) return node.map(slimConfig)
  if (!node || typeof node !== 'object') return node
  const isItem = typeof node.id === 'string' && ('blocks' in node || 'type' in node)
  const out = {}
  for (const [k, v] of Object.entries(node)) {
    out[k] = isItem && k === 'style' ? slimStyle(v) : slimConfig(v)
  }
  return out
}
