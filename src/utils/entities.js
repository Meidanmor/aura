/**
 * Names from WooCommerce and WordPress (categories, tags, terms) come HTML-escaped: "Gifts &amp; Decor".
 * Vue prints text as it is, so a shopper saw "&amp;" (2026-11-22). Decode the common entities before showing a name.
 * Works the same on the server and in the browser (no DOM).
 */
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' }

export function decodeEntities(value) {
  const s = String(value ?? '')
  if (!s.includes('&')) return s
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : all
    }
    return NAMED[code.toLowerCase()] ?? all
  })
}
