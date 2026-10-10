// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file
import 'dotenv/config'
import { defineConfig } from '#q-app/wrappers'
import fs from 'fs'
import path from 'path'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appConfigPath = resolve(__dirname, 'public/config/pwa.json')
const appBrandingPath = resolve(__dirname, 'public/config/branding.json')
const languagesPath = resolve(__dirname, 'public/config/languages.json')

/**
 * The store's languages (public/config/languages.json, written by the store
 * when the owner picks the language): { main: 'he', extra: [], prefixes: {} }.
 * Missing → English only.
 */
function loadLanguages() {
  if (!existsSync(languagesPath)) {
    return { main: 'en', extra: [], prefixes: {} }
  }
  try {
    const data = JSON.parse(readFileSync(languagesPath, 'utf-8'))
    return { main: String(data.main || 'en'), extra: Array.isArray(data.extra) ? data.extra.map(String) : [], prefixes: data.prefixes && typeof data.prefixes === 'object' ? data.prefixes : {} }
  } catch (e) {
    console.warn('Could not parse languages.json:', e.message)
    return { main: 'en', extra: [], prefixes: {} }
  }
}

function loadAppConfig() {
  if (!existsSync(appConfigPath)) {
    return {}
  }

  try {
    return JSON.parse(readFileSync(appConfigPath, 'utf-8'))
  } catch (e) {
    console.warn('Could not parse app-config.json:', e.message)
    return {}
  }
}

function loadAppBranding() {
  if (!existsSync(appBrandingPath)) {
    return {}
  }

  try {
    return JSON.parse(readFileSync(appBrandingPath, 'utf-8'))
  } catch (e) {
    console.warn('Could not parse app-config.json:', e.message)
    return {}
  }

}
// Favicon links for the icons this store has. A platform store's icons come
// from its content (scripts/fetch-content.mjs runs before the build); a store
// without its own icon shows none, so the browser isn't sent to look for one.
function faviconLinks() {
  const has = (file) => existsSync(resolve(__dirname, 'public', file))
  const links = [
    has('icons/favicon-32x32.png') && '<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">',
    has('favicon.ico') && '<link rel="icon" href="/favicon.ico" sizes="any">',
    has('icons/apple-touch-icon.png') && '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">',
  ].filter(Boolean)
  return links.length ? links.join('\n    ') : '<link rel="icon" href="data:,">'
}

export default defineConfig((ctx) => {
  const appConfig = loadAppConfig()
  const appBranding = loadAppBranding()
  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
     preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    /*htmlVariables: {
      csp: `
        default-src 'self';
        script-src 'self' https://accounts.google.com 'unsafe-inline';
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: https:;
        connect-src 'self' ${process.env.WP_BACKEND_URL};
        font-src 'self' https://fonts.gstatic.com;
        frame-src https://accounts.google.com;
  `,
      head: `
    <link rel="preconnect" href="${process.env.WP_BACKEND_URL}" crossorigin>
    <link rel="dns-prefetch" href="${process.env.WP_BACKEND_URL}">
     `
    },
    htmlVariablesRender: {
      csp: (val) => val.replace(/\s+/g, ' ').trim(),
      head: (val) => val.trim()
    },*/
    // index.html: the favicon links (see faviconLinks()).
    htmlVariables: {
      faviconLinks: faviconLinks(),
    },

    // Native app only: send API calls to the live site (src/boot/native-api.js).
    // i18n: the store's language (t() in templates, Quasar's texts and direction).
    boot: ['i18n', ...(ctx.mode.capacitor ? [{ path: 'native-api', server: false }] : [])],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#css
    css: [
      'app.css'
    ],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v7',
      // 'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      //'roboto-font', // optional, you are not bound to it
      //'material-icons', // optional, you are not bound to it
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#build
    build: {
      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node20'
      },

      vueRouterMode: 'history', // available values: 'hash', 'history'
      // vueRouterBase,
      // vueDevtools,
      // vueOptionsAPI: false,

      // rebuildCache: true, // rebuilds Vite/linter/etc cache on startup

      // publicPath: '/',
       //analyze: true,
      // Values the CLIENT bundle may read via process.env.* (never secrets).
      env: {
        // The store's name and description (public/config/pwa.json, from the
        // store's content): the fallback page title and description.
        STORE_NAME: String(appConfig.name || ''),
        STORE_DESCRIPTION: String(appConfig.description || ''),
        // The store's languages (src/i18n): the main one and any extra ones.
        QWOO_LANGUAGES: JSON.stringify(loadLanguages()),
        // Origin of the WordPress backend (wp-admin). The Live Preview
        // bridge only accepts messages from this origin (config-loader.js).
        WP_BACKEND_ORIGIN: (() => {
          try { return process.env.WP_BACKEND_URL ? new URL(process.env.WP_BACKEND_URL).origin : '' } catch { return '' }
        })(),
        // Optional second editor: the store platform's owner dashboard
        // (Design → live preview). Same rules as the WP backend origin.
        QWOO_EDITOR_ORIGIN: (() => {
          try { return process.env.QWOO_EDITOR_ORIGIN ? new URL(process.env.QWOO_EDITOR_ORIGIN).origin : '' } catch { return '' }
        })(),
        // Native app (Capacitor) only: the live storefront whose /wp-json
        // proxy the app calls (the proxy adds the WP secret server-side).
        APP_API_ORIGIN: (() => {
          try { return process.env.APP_API_ORIGIN ? new URL(process.env.APP_API_ORIGIN).origin : '' } catch { return '' }
        })(),
      },
      // rawDefine: {}
      // ignorePublicFolder: true,
      // minify: false,
      // polyfillModulePreload: true,
      // distDir

      // extendViteConf (viteConf) {},
      // viteVuePluginOptions: {},

      cssCodeSplit: true,
      preloadChunks: false,   // ensures critical JS is preloaded
      polyfills: {
        coreJs: false        // PWA modern browsers don't need heavy polyfills
      },
      vitePlugins: [
        ['vite-plugin-checker', {
          eslint: {
            lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{js,mjs,cjs,vue}"',
            useFlatConfig: true
          }
        }, {server: false}],
      ],
      /*extendViteConf(viteConf, {isClient, isServer}) {
        // ONLY apply manualChunks to the client build
        if (isClient) {
          viteConf.build.rollupOptions = {
            ...viteConf.build.rollupOptions,
            output: {
              ...viteConf.build.rollupOptions?.output,
              manualChunks(id) {
                // Group all Quasar components into one file
                if (id.includes('node_modules/quasar/')) {
                  return 'quasar-vendor';
                }
                // Group Vue core libraries
                if (id.includes('node_modules/vue/') || id.includes('node_modules/vue-router/')) {
                  return 'vue-vendor';
                }
              }
            }
          };
        }
      }*/
      // quasar.config.js -> build section
      extendViteConf(viteConf, {isClient}) {
        const isCapacitor = ctx.mode.capacitor;

        viteConf.optimizeDeps = viteConf.optimizeDeps || {}

        // Externalize Capacitor plugins from the bundle (build time)
        // Applied to BOTH client and server passes to prevent Rollup resolution errors
        viteConf.build = viteConf.build || {}
        viteConf.build.rollupOptions = viteConf.build.rollupOptions || {}

        // Native-only plugins: bundled into the Capacitor app (their dynamic
        // imports must NOT carry /* @vite-ignore */, or the app is left with
        // bare "@capacitor/..." specifiers the WebView can't resolve), and
        // kept out of the web/SSR build, where those code paths never run.
        const nativeOnlyPlugins = [
          '@capgo/capacitor-social-login',
          '@capacitor/splash-screen',
          '@capacitor/push-notifications',
          '@capacitor/app'
        ]
        if (!isCapacitor) {
          viteConf.optimizeDeps.exclude = [...nativeOnlyPlugins]

          viteConf.build.rollupOptions.external = [
            ...(viteConf.build.rollupOptions.external || []),
            ...nativeOnlyPlugins
          ]
        }


        viteConf.build.modulePreload = {
          resolveDependencies: (filename, deps) => {
            // Filter out Quasar components from the 'preload' list
            // This forces the browser to wait until the 5-second timer to even start the download
            return deps.filter(dep => !dep.includes('QLayout') && !dep.includes('QList') && !dep.includes('QItemSection') && !dep.includes('use-quasar'));
          },
        }
        if (isClient) {
          viteConf.build.rollupOptions = {
            ...viteConf.build.rollupOptions,

            output: {
              ...viteConf.build.rollupOptions?.output,
              /*manualChunks(id) {
                // If the file is an observer, force it into its own async chunk
                if (
                    id.includes('quasar/src/components/scroll-observer') ||
                    id.includes('quasar/src/components/resize-observer') ||
                    id.includes('quasar/src/directives/touch-pan') ||
                    id.includes('quasar/src/directives/touch-hold') ||
                    id.includes('quasar/src/utils/format')) {
                  return 'quasar-observers-delayed';
                }

                // DO NOT group the rest of quasar here.
                // Let Vite handle the rest automatically so your
                // defineAsyncComponent logic actually creates separate files.
              }*/
            }
          };
        }
        // ... inside extendViteConf
        viteConf.resolve.alias = {
          'src/services/push/push.js': isCapacitor
              ? path.resolve(__dirname, 'src/services/push/native.js')
              : path.resolve(__dirname, 'src/services/push/web.js'),
          ...viteConf.resolve.alias
        };
      },
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#devserver
devServer: {
  https: (() => {
    if (!ctx.dev || ctx.mode.capacitor) return false // no https needed at all here
    const keyPath = './certs/localhost-key.pem'
    const certPath = './certs/localhost.pem'
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      }
    }
    return false
  })(),
  port: 9000,
  host: '0.0.0.0',
  open: !ctx.mode.capacitor,

  proxy: ctx.mode.capacitor ? {} : {

    '/wp-json': {
      target: process.env.WP_BACKEND_URL || '',
      changeOrigin: true,
      secure: true,
      cookieDomainRewrite: process.env.WP_BACKEND_URL
          ? { [new URL(process.env.WP_BACKEND_URL).hostname]: 'localhost' }
          : {},
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq) => {
          proxyReq.setHeader('X-Proxy-Secret', process.env.PROXY_SHARED_SECRET || '')
        })
      }
    }
  }
},

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#framework
    framework: {
      config: {
        // The page's lang and dir come from App.vue (useMeta), per page language.
        // Quasar would otherwise set them to its default English in the
        // browser before the app's language loads: a left-to-right flash on
        // right-to-left pages.
        lang: { noHtmlAttrs: true },
        brand: {
          primary: appBranding.global_colors.primary || '#FFFFFF',
          bg: appBranding.global_colors.bg || '#FFFFFF',
          'text': appBranding.global_colors.text || '#414752',
          secondary: appBranding.global_colors.secondary || '#005DAC',
          accent: appBranding.global_colors.accent || '#005DAC',
          dark: appBranding.global_colors.dark || '#1d1d1d',
          'dark-page': appBranding.global_colors.darkPage || '#121212',
          positive: appBranding.global_colors.positive || '#21BA45',
          negative: appBranding.global_colors.negative || '#C10015',
          info: appBranding.global_colors.info || '#c9c5c0',
          warning: appBranding.global_colors.warning || '#F2C037'
        },
        loadingBar: {
          color: 'secondary',
          size: '5px',
          position: 'top'
        }
      },
      cssAddon: false,

      // SVG version of Quasar's own icon set: the icons Quasar components use
      // internally (field error icon, select dropdown arrow, checkbox tick,
      // expansion chevrons, ...) become inline SVGs, so no icon font is needed
      // — the app imports its other icons manually from @quasar/extras.
      iconSet: 'svg-material-icons',
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //

      /*components: [
          // Only list the components you REALLY need above the fold
        'QLayout',
        'QHeader',
        'QToolbar',
        'QBtn',
        'QImg'
      ],*/

     /* directives: [
          'TouchPan',   // only if you use it
        //'Ripple',
      ],*/


      // Quasar plugins
      plugins: ['Notify','Meta','LoadingBar','Dialog'],
      //removeDefaultCss: true
    },

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#sourcefiles
    // sourceFiles: {
    //   rootComponent: 'src/App.vue',
    //   router: 'src/router/index',
    //   store: 'src/store/index',
    //   pwaRegisterServiceWorker: 'src-pwa/register-service-worker',
    //   pwaServiceWorker: 'src-pwa/custom-service-worker',
    //   pwaManifestFile: 'src-pwa/manifest.json',
    //   electronMain: 'src-electron/electron-main',
    //   electronPreload: 'src-electron/electron-preload'
    //   bexManifestFile: 'src-bex/manifest.json
    // },

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    ssr: {
      prodPort: 3000, // The default port that the production server should use
                      // (gets superseded if process.env.PORT is specified at runtime)

      middlewares: [
        'render' // keep this as last one
      ],

      manualMetaInjection: true,
      // extendPackageJson (json) {},
      //extendSSRWebserverConf (/*esbuildConf*/) {manualMetaInjection: true /*Ensure Quasar uses meta from ssrContext*/ },

      // manualStoreSerialization: true,
      // manualStoreSsrContextInjection: true,
      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,

      pwa: true,
      // pwaOfflineHtmlFilename: 'offline.html', // do NOT use index.html as name!

      // pwaExtendGenerateSWOptions (cfg) {},
      // pwaExtendInjectManifestOptions (cfg) {}
      criticalCSS: true,
      prodScriptNamedExport: 'app'
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      // Quasar precaches the whole client build by default. Images are left
      // out: every visitor would otherwise download every hero/section/icon
      // image when the service worker installs, and the list grows with each
      // image the Shop Builder pushes. They're cached at runtime instead,
      // when actually viewed (the image route in custom-service-worker.js).
      // The published JSON (config/*.json, data/*.json) isn't precached either:
      // the service worker fetches it fresh and keeps a copy for offline, so a
      // change shows up as soon as it's deployed (see custom-service-worker.js).
      // JS/CSS/fonts and the offline page stay precached.
      extendInjectManifestOptions (cfg) {
        cfg.globIgnores = [
          ...(cfg.globIgnores || []),
          '**/*.{png,jpg,jpeg,webp,avif,gif,svg,ico,mp4,webm}',
          'config/*.json',
          'data/*.json',
        ]
      },
      workboxMode: 'InjectManifest', // 'GenerateSW' or 'InjectManifest'
      injectManifest: {
        workboxMode: 'injectManifest',
        swSrc: 'src-pwa/custom-service-worker.js',
        swDest: 'service-worker.js',
        injectPwaMetaTags: true,
        manifestFilename: 'manifest.json',
        useCredentialsForManifestTag: false,
        exclude: [/\.map$/, /netlify\.toml$/], // exclude netlify.toml just in case
      },
      //useCredentialsForManifestTag: false,
      manifest: {
        name: 'Q-Woo - Advanced e-commerce shop',
        short_name: 'Q-Woo',
        description: 'Headless WooCommerce SSR PWA storefront',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#005DAC',
        icons: [
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-256x256.png',
            sizes: '256x256',
            type: 'image/png'
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      // swFilename: 'sw.js',
      // manifestFilename: 'manifest.json',
      extendManifestJson (json) {
        Object.entries(appConfig).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            json[key] = value
          }
        })
        // Only the icons this store has (none without its own icon).
        json.icons = (json.icons || []).filter(icon => existsSync(resolve(__dirname, 'public', String(icon.src).replace(/^\//, ''))))
      },
      // useCredentialsForManifestTag: true,
      // injectPwaMetaTags: false,
      extendPWACustomSWConf (config) {
        config.target = 'es2022'
      },      // extendGenerateSWOptions (cfg) {},
      // extendInjectManifestOptions (cfg) {}
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: false
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-browser-extensions/configuring-bex
    bex: {
      // extendBexScriptsConf (esbuildConf) {},
      // extendBexManifestJson (json) {},

      /**
       * The list of extra scripts (js/ts) not in your bex manifest that you want to
       * compile and use in your browser extension. Maybe dynamic use them?
       *
       * Each entry in the list should be a relative filename to /src-bex/
       *
       * @example [ 'my-script.ts', 'sub-folder/my-other-script.js' ]
       */
      extraScripts: []
    }
  }
})