import { computed, inject } from 'vue'

/**
 * "Leave out this page's product" (Product Grid, Carousel, Featured Products):
 * on the product page template, the id of the product being viewed, else 0.
 * On unless the owner turned it off.
 */
export function useExcludedProduct(data) {
  const p = inject('productPage', null)
  return computed(() => (p && data()?.exclude_current !== false ? Number(p.product?.id) || 0 : 0))
}

/**
 * "Related to this page's product": the product and its first category, for a block whose
 * data asks for it ({ id: 0 } anywhere else, and for other queries).
 */
export function useRelatedProduct(data) {
  const p = inject('productPage', null)
  return computed(() => (p && data()?.query_type === 'related'
    ? { id: Number(p.product?.id) || 0, category_id: Number(p.product?.categories?.[0]?.id) || 0 }
    : { id: 0, category_id: 0 }))
}

/** A block's data key per product while one is left out (the template shows on every product). */
export const keyWithProduct = (blockId, id) => (id ? `${blockId}:p${id}` : blockId)
