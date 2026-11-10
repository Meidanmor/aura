let catalogPromise = null

/** Loads the store's already-public catalog once per browser runtime. */
export async function getPublicProductCatalog() {
  if (typeof window === 'undefined') return []
  if (!catalogPromise) {
    catalogPromise = fetch('/data/products.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Catalog request failed: ${res.status}`)
        return res.json()
      })
      .then((catalog) => {
        if (!Array.isArray(catalog)) throw new Error('Product catalog has an invalid shape.')
        return catalog
      })
      .catch((error) => {
        catalogPromise = null
        throw error
      })
  }
  return catalogPromise
}
