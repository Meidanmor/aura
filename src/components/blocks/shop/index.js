import { defineAsyncComponent } from 'vue'

// Shop page templates (Store builder → Shop pages): loaded only on the pages that use them.
const shopBlock = (name) => defineAsyncComponent(() => import(`./${name}.vue`))
const SHOP_BLOCKS = {
  product_breadcrumbs: 'ProductBreadcrumbsBlock', product_gallery: 'ProductGalleryBlock', product_thumbnails: 'ProductThumbnailsBlock', product_title: 'ProductTitleBlock',
  product_rating: 'ProductRatingBlock', product_categories: 'ProductCategoriesBlock', product_price: 'ProductPriceBlock',
  product_description: 'ProductDescriptionBlock', product_stock: 'ProductStockBlock', product_add_to_cart: 'ProductAddToCartBlock', product_sticky_cart: 'ProductStickyCartBlock',
  product_wishlist: 'ProductWishlistBlock', product_attributes: 'ProductAttributesBlock', product_sku: 'ProductSkuBlock', product_share: 'ProductShareBlock',
  product_reviews: 'ProductReviewsBlock', product_related: 'ProductRelatedBlock', product_faq: 'ProductFaqBlock', product_together: 'ProductTogetherBlock',
  archive_breadcrumbs: 'ArchiveBreadcrumbsBlock', archive_title: 'ArchiveTitleBlock', archive_filters: 'ArchiveFiltersBlock',
  archive_count: 'ArchiveCountBlock', archive_sort: 'ArchiveSortBlock', archive_filters_button: 'ArchiveFiltersButtonBlock', archive_products: 'ArchiveProductsBlock',
  archive_pagination: 'ArchivePaginationBlock',
  cart_title: 'CartTitleBlock', cart_items: 'CartItemsBlock', cart_totals: 'CartTotalsBlock',
  checkout_title: 'CheckoutTitleBlock', checkout_login: 'CheckoutLoginBlock', checkout_details: 'CheckoutDetailsBlock',
  checkout_summary: 'CheckoutSummaryBlock', checkout_place_order: 'CheckoutPlaceOrderBlock',
  checkout_contact: 'CheckoutContactBlock', checkout_shipping_address: 'CheckoutShippingAddressBlock', checkout_billing_address: 'CheckoutBillingAddressBlock',
  checkout_coupon: 'CheckoutCouponBlock', checkout_items: 'CheckoutItemsBlock', checkout_shipping: 'CheckoutShippingBlock',
  checkout_payment: 'CheckoutPaymentBlock', checkout_totals: 'CheckoutTotalsBlock',
}
export const shopBlocks = {}
for (const [type, name] of Object.entries(SHOP_BLOCKS)) shopBlocks[type] = shopBlock(name)
