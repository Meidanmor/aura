/**
 * SVG icons drawn in the page. The store publishes a cleaned copy of an SVG
 * image's code as `svg` next to its url (Qwoo_Svg_Sanitizer::inline_markup:
 * no scripts, no <style>, ids made unique, colours turned into currentColor
 * when the block asks for its colour). This checks it once more before it's
 * put in the page; anything unexpected falls back to a plain image.
 */
const BAD = [
  /<\s*\/?\s*(script|style|foreignobject|iframe|image|img|a|animate\w*|set|object|embed)\b/i,
  /\son[a-z]+\s*=/i,
  /javascript:|vbscript:|data:/i,
  /(?:xlink:)?href\s*=\s*["'](?!#)/i,
  /url\(\s*["']?(?!#)/i,
]

/** The image's SVG code when it's safe to draw, else ''. */
export function safeSvg(image) {
  const svg = image && typeof image === 'object' ? image.svg : ''
  if (typeof svg !== 'string' || svg.length > 50000 || !/^<svg[\s>]/i.test(svg.trim())) return ''
  return BAD.some((re) => re.test(svg)) ? '' : svg
}

/** An image payload's url ({ url } or an older plain string). */
export function imageUrl(image) {
  return (typeof image === 'string' ? image : image?.url) || ''
}

/** For CSS (mask-image): a url the page may load, quoted. */
export function cssUrl(url) {
  if (!/^(https?:\/\/|\/(?!\/))/.test(url)) return ''
  return `url("${url.replace(/["\\\n\r]/g, encodeURIComponent)}")`
}
