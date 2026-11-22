/**
 * Sample products: the examples a store designed by the AI starts with. The store sends
 * `extensions.qwoo.sample: true` (Qwoo_Sample_Products) and refuses to add them to a cart;
 * the storefront shows a "Sample" badge and a disabled "Sample product" button instead of
 * Add to cart. The flag comes with the product data, so the server and the browser draw the same.
 */
export const isSampleProduct = (product) => product?.extensions?.qwoo?.sample === true
