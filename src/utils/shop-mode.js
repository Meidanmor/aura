/**
 * Sell online / Shopper accounts off (the store's dashboard → Settings → General / Sign-in).
 * The store sends it with the live version (src-ssr/site-content.js: `shop`, only while one of
 * them is off), so a change shows within seconds, with no publish. The server reads it from
 * globalThis.__QWOO_SHOP, the browser from window.__QWOO_SITE__.shop: both draw the same page.
 *
 * shop: { sell, products: catalog | hide, addr: home | closed | notfound, accounts, closed: { lang: text } }
 * The store itself refuses what these pages would do (adding products to a cart, signing in).
 */
import { stripLang } from 'src/i18n/lang.js'

function state() {
  const s = typeof window === 'undefined' ? globalThis.__QWOO_SHOP : window.__QWOO_SITE__?.shop
  return s && typeof s === 'object' ? s : null
}

export const shopOff = () => state()?.sell === false
export const productsHidden = () => shopOff() && state()?.products === 'hide'
export const accountsOff = () => state()?.accounts === false

/** What a closed shop address shows: home (sent there), closed (the owner's message) or notfound. */
export const shopAddr = () => (['home', 'closed', 'notfound'].includes(state()?.addr) ? state().addr : 'home')

/** The owner's "shop is closed" message in this language ('' = the built-in one). */
export const closedMessage = (lang) => String(state()?.closed?.[lang] || '')

/** Whether this address is closed now (path with or without the language prefix). */
export function shopClosedPath(path) {
  const p = stripLang(String(path || '/')).replace(/\/+$/, '') || '/'
  if (accountsOff() && /^\/(my-account|forgot-password|reset-password)(\/|$)/.test(p)) return true
  if (!shopOff()) return false
  // The checkout stays: a paid booking pays there (the store accepts nothing else).
  if (/^\/cart$/.test(p)) return true
  if (productsHidden() && /^\/(products|product|product-category)(\/|$)/.test(p)) return true
  return false
}

/** null (the page as usual), or home | closed | notfound for a closed address. */
export const shopGate = (path) => (shopClosedPath(path) ? shopAddr() : null)

/** Store builder blocks that have nothing to do while the shop or accounts are off. */
const SHOP_BLOCKS = new Set(['mini_cart', 'mini_wishlist', 'product_wishlist', 'wishlist_items', 'cart_suggestions', 'free_shipping_bar', 'product_together', 'product_sticky_cart', 'product_back_in_stock'])
const ACCOUNT_BLOCKS = new Set(['account_widget', 'login_form', 'signup_form', 'checkout_login'])

export function blockOffNow(type) {
  if (!state()) return false
  return (shopOff() && SHOP_BLOCKS.has(type)) || (accountsOff() && ACCOUNT_BLOCKS.has(type))
}

/** Catalog mode for one product: no price, no Add to cart (extensions.qwoo.zero_price.catalog). */
export const isCatalog = (product) => !!product?.extensions?.qwoo?.zero_price?.catalog
