// What a cart line shows for a chosen option. The cart keeps the choice's slug for shared
// options (the store matches on it), which for Hebrew and other non-Latin names is a web code
// ("%d7%a4%d7%95…"). Show the name the product page shows: the saved label, or the slug read
// back into letters for older carts saved before the label was kept.
export function optionLabel (v) {
  if (!v) return ''
  if (v.label) return String(v.label)
  const value = String(v.value ?? '')
  if (!/%[0-9a-f]{2}/i.test(value)) return value
  try {
    return decodeURIComponent(value).replace(/-/g, ' ')
  } catch {
    return value
  }
}
