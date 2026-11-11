import { reactive } from 'vue'

/**
 * "Choose options" from a product card: the product whose options are being chosen
 * (QuickOptions.vue, once in the layout, draws the sheet / window). Browser only.
 */
export const quickOptions = reactive({ product: null })

/** Products the sheet handles: ones sold in variations (sizes, colours…). Gift cards and grouped products open their page. */
export function canQuickChoose(product) {
  return product?.type === 'variable'
    && Array.isArray(product.variations) && product.variations.length > 0
    && Array.isArray(product.attributes)
    && !product.extensions?.qwoo_giftcard?.amounts
}

export function openQuickOptions(product) {
  quickOptions.product = product
}

export function closeQuickOptions() {
  quickOptions.product = null
}
