import { setResponsiveVar, toCssLength } from 'src/composables/useSectionStyle.js'

/**
 * Style → Icon Alignment / Icon Offset of a button with an icon (Button, Filters
 * Button, Add To Cart, a card's Add to cart button), per screen size: where the
 * icon sits next to the text (top / middle / bottom) and a nudge up or down.
 * Only sizes that differ from the bigger one get a variable. CSS: app.css .has-icon-align.
 */
const ALIGN = { start: 'flex-start', center: 'center', end: 'flex-end' }

export function iconAlign(d = {}) {
  const vars = {}
  setResponsiveVar(vars, '--ia-al', d.icon_align, (v) => ALIGN[v] || null)
  setResponsiveVar(vars, '--ia-off', d.icon_offset, toCssLength)
  return { cls: Object.keys(vars).length ? 'has-icon-align' : '', vars }
}
