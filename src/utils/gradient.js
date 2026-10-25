import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'

/**
 * A fill from a Store builder colour and its optional "second colour":
 * both set → a linear gradient at the angle (degrees), one set → that colour,
 * none → ''.
 */
export function gradientOf(first, second, angle = 90) {
  const a = resolveGlobalColor(first)
  const b = resolveGlobalColor(second)
  if (a && b) {
    const deg = Number.isFinite(Number(angle)) ? Math.max(0, Math.min(360, Number(angle))) : 90
    return `linear-gradient(${deg}deg, ${a}, ${b})`
  }
  return a || b || ''
}
