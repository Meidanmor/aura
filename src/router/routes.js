import ProductsPage from 'pages/ProductsPage.vue'
import ProductPage from 'pages/ProductPage.vue'
import CategoryPage from 'pages/CategoryPage.vue'
import CartPage from 'pages/CartPage.vue'
import CheckoutPage from 'pages/CheckoutPage.vue'
import { extraLangs, mainLang, prefixOf } from 'src/i18n/lang.js'

const MainLayout = () => import('layouts/MainLayout.vue')

/**
 * The store's pages, the same in every language. suffix: added to route
 * names in an extra language ('products@en'), since names must be unique;
 * the router finds the right one (router/index.js).
 */
const pages = (suffix = '') => {
  const named = (name) => name + suffix
  return [
    { path: '', component: () => import('pages/IndexPage.vue') },
    { path: 'product/:slug', component: ProductPage },
    { path: 'product-category/:slug', component: CategoryPage },
    { path: 'cart', component: CartPage },
    {
      path: 'checkout',
      component: CheckoutPage,
    },
    { path: 'products', name: named('products'), component: ProductsPage },
    { path: 'thank-you', name: named('thank-you'), component: () => import('pages/ThankYouPage.vue') },
    { path: 'my-account', name: named('my-account'), component: () => import('pages/AccountPage.vue') },
    { path: 'forgot-password', name: named('forgot-password'), component: () => import('pages/ForgotPasswordPage.vue') },
    { path: 'reset-password', name: named('reset-password'), component: () => import('pages/ResetPasswordPage.vue') },
    // From the "How was your order?" email (?o=order&p=product&t=token).
    { path: 'review', name: named('review'), component: () => import('pages/ReviewPage.vue') },
    // The store's blog (posts read live from the store).
    { path: 'blog', name: named('blog'), component: () => import('pages/BlogPage.vue') },
    { path: 'blog/category/:category', name: named('blog-category'), component: () => import('pages/BlogPage.vue') },
    { path: 'blog/:slug', name: named('blog-post'), component: () => import('pages/BlogPostPage.vue') },

    // The store owner's own pages (/about, /shipping…, built in the dashboard).
    // The app's own routes above are static, so they always win over this one.
    // (pagePath may have slashes: pages inside pages, /about/team.)
    { path: ':pagePath(.+)', name: named('custom-page'), component: () => import('pages/CustomPage.vue') },

    // Always leave this as last one,
    // but you can also remove it.
    // Nested under MainLayout so unmatched routes still get the
    // header, nav, and footer instead of a bare, dead-end page.
    { path: ':catchAll(.*)*', component: () => import('pages/ErrorNotFound.vue') }
  ]
}

/**
 * Built for each router (each page render on the server, once in the
 * browser), from the store's languages as published.
 */
const routes = () => [
  {
    path: '/',
    component: MainLayout,
    meta: { lang: mainLang() },
    children: [
      ...pages(),
      {
        path: '/auth/callback',
        component: () => import('pages/AuthCallback.vue'),
        meta: { public: true } // optional, if you have auth guards
      },
    ]
  },
  // Each extra language: the same pages under its prefix (/en/…).
  ...extraLangs().map((code) => ({
    path: `/${prefixOf(code)}`,
    component: MainLayout,
    meta: { lang: code },
    children: pages(`@${code}`),
  })),
]

export default routes
