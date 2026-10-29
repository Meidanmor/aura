// Slugs come encoded from the API ("%d7%98…") and decoded from the
// router ("טבעות"): compare them decoded.
export function plainSlug(s = '') {
  try { return decodeURIComponent(String(s)).toLowerCase() } catch { return String(s).toLowerCase() }
}

export function sameSlug(a = '', b = '') {
  return plainSlug(a) === plainSlug(b)
}

/** The product's slug from its permalink (".../product/<slug>/"). */
export function slugOfPermalink(permalink = '') {
  const match = String(permalink).match(/product\/([^/]+)\/?$/)
  return match ? match[1] : ''
}
