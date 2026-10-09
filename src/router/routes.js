import ProductsPage from 'pages/ProductsPage.vue'
import ProductPage from 'pages/ProductPage.vue'
import CategoryPage from 'pages/CategoryPage.vue'
import CartPage from 'pages/CartPage.vue'
import CheckoutPage from 'pages/CheckoutPage.vue'

const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'product/:slug', component: ProductPage },
      { path: 'product-category/:slug', component: CategoryPage },
      { path: 'cart', component: CartPage },
      {
        path: 'checkout',
        component: CheckoutPage,
      },
      { path: 'products', name: 'products', component: ProductsPage },
      { path: 'thank-you', name: 'thank-you', component: () => import('pages/ThankYouPage.vue') },
      { path: 'my-account', name: 'my-account', component: () => import('pages/AccountPage.vue') },
      { path: 'forgot-password', name: 'forgot-password', component: () => import('pages/ForgotPasswordPage.vue') },
      { path: 'reset-password', name: 'reset-password', component: () => import('pages/ResetPasswordPage.vue') },
      // From the "How was your order?" email (?o=order&p=product&t=token).
      { path: 'review', name: 'review', component: () => import('pages/ReviewPage.vue') },
      // The store's blog (posts read live from the store).
      { path: 'blog', name: 'blog', component: () => import('pages/BlogPage.vue') },
      { path: 'blog/category/:category', name: 'blog-category', component: () => import('pages/BlogPage.vue') },
      { path: 'blog/:slug', name: 'blog-post', component: () => import('pages/BlogPostPage.vue') },
        {
  path: '/auth/callback',
  component: () => import('pages/AuthCallback.vue'),
  meta: { public: true } // optional, if you have auth guards
},

      // The store owner's own pages (/about, /shipping…, built in the dashboard).
      // The app's own routes above are static, so they always win over this one.
      // (pagePath may have slashes: pages inside pages, /about/team.)
      { path: ':pagePath(.+)', name: 'custom-page', component: () => import('pages/CustomPage.vue') },

      // Always leave this as last one,
      // but you can also remove it.
      // Nested under MainLayout so unmatched routes still get the
      // header, nav, and footer instead of a bare, dead-end page.
      { path: ':catchAll(.*)*', component: () => import('pages/ErrorNotFound.vue') }
    ]
  }
]

export default routes