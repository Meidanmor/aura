/**
 * Product details (attributes) picked in the Store builder (field type details): a list
 * of keys, a shared detail's taxonomy (pa_size) or a product's own detail name. Older
 * blocks saved typed names, one per line (or one name on product cards).
 */
export function detailKeys(value) {
  if (Array.isArray(value)) return value.map((k) => String(k ?? '').trim()).filter(Boolean)
  return String(value || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
}

const norm = (s) => String(s || '').trim().toLowerCase()

/** Is this attribute ({ name, taxonomy }) the one the key stands for? */
export function matchesDetail(attr, key) {
  if (!attr || !key) return false
  if (attr.taxonomy && attr.taxonomy === key) return true
  return norm(attr.name) === norm(key)
}

/** The attributes the keys pick, in the keys' order, each once. */
export function pickDetails(attrs, keys) {
  const out = []
  for (const key of keys) {
    const a = (attrs || []).find((x) => matchesDetail(x, key))
    if (a && !out.includes(a)) out.push(a)
  }
  return out
}
