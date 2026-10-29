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

/** A block's data key per product while one is left out (the template shows on every product). */
export const keyWithProduct = (blockId, id) => (id ? `${blockId}:p${id}` : blockId)
