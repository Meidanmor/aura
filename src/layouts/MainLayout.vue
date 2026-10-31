<template>
  <q-layout view="hHh lpR fFf">
    <AnnouncementBar v-if="headerSettings?.announcement?.enabled && (typeof headerSettings?.announcement?.text === 'string' && headerSettings.announcement.text.trim().length > 0)" :announcement="headerSettings?.announcement" />

    <!-- The header's "Above header" sections: outside the header element, they scroll away with the page. -->
    <div v-if="aboveHeader.length" class="above-header">
      <SectionRenderer :sections="aboveHeader" page="header" />
    </div>

    <AppHeader
        :header-config="shownHeader"
        :is-super-admin="isSuperAdmin"
        :app-logo="brandSettings?.logo"
        :logo-width="brandSettings?.logo_width"
        :logo-height="brandSettings?.logo_height"
        :sticky-header="shownHeader?.settings?.sticky"
        :menu="Array.isArray(headerSettings?.menu) ? headerSettings.menu : null"
    />
    <!-- The drawers the page's widgets asked for (Menu, Mini Cart, Mini Wishlist): src/composables/useDrawers.js. -->
    <template v-if="uiHydrated">
      <q-drawer
          v-for="dr in drawerList"
          :key="dr.key"
          :ref="(c) => setDrawerRef(dr.key, c)"
          :model-value="drawers.state.open === dr.key"
          :side="qSide(dr.key)"
          overlay
          behavior="mobile"
          no-swipe-open
          :width="drawerWidth"
          :class="['widget-drawer', `widget-drawer--${dr.kind}`, { 'cart-drawer': dr.kind === 'cart' }]"
          :style="{ background: dr.bg || undefined, color: dr.color || undefined }"
          @update:model-value="(v) => (v ? drawers.open(dr.key) : drawers.close(dr.key))"
      >
        <MobileNavDrawer
            v-if="dr.kind === 'menu'"
            :menu="Array.isArray(dr.items) ? dr.items : null"
            :title="dr.title"
            :show-languages="dr.showLanguages !== false"
            :show-notifications="dr.showNotifications !== false"
            :supported="supported"
            :permission="permission"
            :is-super-admin="isSuperAdmin"
            @close="drawers.close()"
            @subscribe="handleSubscribe"
        />
        <CartDrawer v-else-if="dr.kind === 'cart'" :title="dr.title" @toggle-cart="drawers.close()" />
        <WishlistDrawer v-else :title="dr.title" @toggle-wishlist="drawers.close()" />
      </q-drawer>
    </template>

    <q-page-container style="padding-top: 0">
      <main>
        <router-view />
      </main>
    </q-page-container>

    <AppFooter
        :sections="Array.isArray(shownFooter?.sections) ? shownFooter.sections : []"
        :app-logo="brandSettings?.logo"
        :footer-text="footerSettings?.footer_text"
        :columns="Array.isArray(footerSettings?.columns) ? footerSettings.columns : null"
    />

    <SeoWait />

    <ConsentBanner v-if="uiHydrated" />
    <ContactButton v-if="uiHydrated" />

    <!-- Store builder → Popups (browser only). -->
    <PopupHost v-if="uiHydrated" />
    <CardPreviewHost v-if="uiHydrated" />
    <!-- An import running on the store: its pages under an "updating" notice. -->
    <UpdatingOverlay v-if="uiHydrated" />

    <NotificationSoftAskModal
        v-if="uiHydrated"
        :model-value="notificationSoftAskVisible && !ownerCode"
        :texts="softAskTexts"
        @enable="handleSoftAskEnable"
        @dismiss="dismissNotificationSoftAsk"
    />
    <NotificationSoftAskModal
        v-if="uiHydrated && ownerCode"
        :model-value="true"
        :texts="OWNER_TEXTS"
        @enable="connectOwnerDevice"
        @dismiss="ownerCode = ''"
    />

  </q-layout>
</template>

<script setup>
import {ref, computed, watch, onMounted, onUnmounted, useSSRContext, provide} from 'vue'
import { loadPageConfig, subscribeToLiveConfig } from 'src/utils/config-loader'
import { resolveHeroImageSrc } from 'src/utils/resolve-hero-image'
import { applyBrandFonts } from 'src/utils/brand-fonts.js'
import { provideDrawers } from 'src/composables/useDrawers.js'
import { isNativeApp, liveUrl } from 'src/utils/native-app'
import { useQuasar } from 'quasar'
import cart from 'src/stores/cart'
import wishlist from 'src/stores/wishlist'
import { isAdmin } from 'src/stores/user'
import WishlistDrawer from '../components/app/WishlistDrawer.vue'
import CartDrawer from '../components/app/CartDrawer.vue'
import MobileNavDrawer from '../components/app/MobileNavDrawer.vue'
import AppHeader from '../components/app/AppHeader.vue'
import AppFooter from '../components/app/AppFooter.vue'
import AnnouncementBar from '../components/app/AnnouncementBar.vue'
import SectionRenderer from 'components/sections/SectionRenderer.vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { stripLang } from 'src/i18n/lang.js'
import { chromeTarget, pickChrome } from 'src/utils/layouts.js'
import { initCustomCode } from 'src/utils/custom-code.js'
import { useRoute, useRouter } from 'vue-router'
import { Platform } from 'quasar';
import ConsentBanner from "../components/app/ConsentBanner.vue";
import ContactButton from "../components/app/ContactButton.vue";
import initPush, { subscribeToWebPush, initNativePush, checkNativePermission } from 'src/services/push/push.js'
import { initLoadingBar } from 'src/composables/useLoadingBar.js'
import { initAuthPopup } from 'src/composables/useAuthExpired.js'
import { initSessionWatcher } from 'src/composables/useSessionWatcher.js'
import {
  initNotificationSoftAskTracking,
  showNotificationSoftAsk,
  dismissNotificationSoftAsk,
  pushKeyReady,
  softAskTexts
} from 'src/composables/useNotificationSoftAsk.js'
import { getPushConfig } from 'src/services/push/shared.js'
import NotificationSoftAskModal from 'src/components/app/NotificationSoftAskModal.vue'
import PopupHost from 'src/components/popups/PopupHost.vue'
import CardPreviewHost from 'src/components/loops/CardPreviewHost.vue'
import UpdatingOverlay from 'src/components/app/UpdatingOverlay.vue'
import SeoWait from 'src/components/app/SeoWait.js'
import {getApiOrigin} from "src/utils/server/get-api-origin.js";
import {
  matWifi,
  matSignalWifiOff,
  matError } from '@quasar/extras/material-icons'
import { setCssVar } from 'quasar'
import { useI18n } from 'src/i18n/index.js'
import { checkSession } from 'src/composables/useAccount.js'

const { t } = useI18n()

function applyGlobalColors(colors) {
  if (!colors) return
  if (colors.primary)   setCssVar('primary', colors.primary)
  if (colors.secondary) setCssVar('secondary', colors.secondary)
  if (colors.accent)    setCssVar('accent', colors.accent)
  if (colors.bg)        setCssVar('bg', colors.bg)
  if (colors.dark)      setCssVar('dark', colors.dark)
  if (colors.darkPage)  setCssVar('dark-page', colors.darkPage)
  if (colors.positive)  setCssVar('positive', colors.positive)
  if (colors.negative)  setCssVar('negative', colors.negative)
  if (colors.info)      setCssVar('info', colors.info)
  if (colors.warning)   setCssVar('warning', colors.warning)
  if (colors.text)      setCssVar('text', colors.text)
}
// Inside your Page or Layout
defineOptions({
  async preFetch ({ ssrContext, currentRoute }) {

    const siteURL = getApiOrigin(ssrContext) || '';

    // Fire both requests at the same time
    const isPreview = currentRoute.query.preview === 'true'

    const configData = await loadPageConfig('branding', isPreview, siteURL)

    const headerConfig = await loadPageConfig('header', isPreview, siteURL);
    const footerConfig = await loadPageConfig('footer', isPreview, siteURL);
    if (configData) {
      configData.logo = await resolveHeroImageSrc(configData.logo, "branding", siteURL, configData.logo_path)
    }

    if (ssrContext) {
      ssrContext.brandConfig = configData
      ssrContext.headerConfig = headerConfig
      ssrContext.footerConfig = footerConfig

    } else {
      window.__BRAND_CONFIG__ = configData;
      window.__HEADER_CONFIG__ = headerConfig;
      window.__FOOTER_CONFIG__ = footerConfig;
    }
  }
})
let liveConfigUnsubscribers = []
// No server render (the native app, or the offline app shell): nothing came with the page.
// (render.js always writes <style id="qwoo-fonts">.)
const drawnHere = process.env.CLIENT && !document.getElementById('qwoo-fonts')
const brandSettings = ref(
    process.env.CLIENT && window.__BRAND_CONFIG__
        ? window.__BRAND_CONFIG__
        : null
)
const headerSettings = ref(
    process.env.CLIENT && window.__HEADER_CONFIG__
        ? window.__HEADER_CONFIG__
        : null
)

const footerSettings = ref(
    process.env.CLIENT && window.__FOOTER_CONFIG__
        ? window.__FOOTER_CONFIG__
        : null
)

if (process.env.SERVER) {
  const ssr = useSSRContext()
  brandSettings.value = ssr?.brandConfig || null
  headerSettings.value = ssr?.headerConfig || null
  footerSettings.value = ssr?.footerConfig || null
}

const siteMenus = computed(() => {
  return headerSettings.value?.menus || footerSettings.value?.menus || {}
})
const headerMenu = computed(() => headerSettings.value?.menu || [])

provide('siteMenus', siteMenus)
// Branding (colours, fonts, the store's sign-in settings: Sign In / Sign Up forms read `account`).
provide('brandSettings', brandSettings)
provide('headerMenu', headerMenu)
// The page's drawers: each Menu, Mini Cart and Mini Wishlist widget adds its own.
const drawers = provideDrawers()
const drawerList = computed(() => drawers.state.order.map((key) => ({ key, ...drawers.state.entries[key] })))
// For widgets written before the drawer list (they emit these).
provide('layoutActions', {
  openMobileMenu: () => drawers.open(drawers.firstMenu()),
  closeMobileMenu: () => drawers.close(),
  toggleCart: () => drawers.toggle('cart'),
  toggleWishlist: () => drawers.toggle('wishlist'),
})

async function hideSplash() {
  if (!Platform.is.capacitor) return
  try {
    const {SplashScreen} = await import('@capacitor/splash-screen')
    await SplashScreen.hide({ fadeOutDuration: 500 })
  } catch (err) {
    console.warn('SplashScreen hide failed', err)
  }
}

function normalizePermission(value) {
  if (value === 'prompt') { return 'default' } else if (value === 'initialized') { return 'granted' }
  return value
}
/* eslint-disable no-unused-vars */
const _responsiveClasses = 'gt-sm lt-md gt-md lt-sm'
/* eslint-enable no-unused-vars */

const permission = ref('default')
const supported = ref(false)
const notificationSoftAskVisible = computed(() =>
    pushKeyReady.value && supported.value && permission.value === 'default' && showNotificationSoftAsk.value
)
// The owner's test link (dashboard → Notifications): /?qwoo_push_owner={code} offers to connect this device.
const ownerCode = ref('')
const OWNER_TEXTS = computed(() => ({
  title: t('Test notifications'),
  text: t('Turn on notifications on this device to get the tests you send from your dashboard.'),
  yes: t('Turn on'),
  no: t('Not now'),
}))
async function connectOwnerDevice() {
  const code = ownerCode.value
  ownerCode.value = ''
  const ok = await subscribeToWebPush({ ownerCode: code })
  permission.value = Notification.permission
  $q.notify({ type: ok ? 'positive' : 'warning', message: ok ? t('This device gets your test notifications now.') : t('Notifications are blocked on this device. Allow them in the browser\'s settings.') })
}
const isSuperAdmin = isAdmin
const $q = useQuasar()

const drawerWidth = computed(() => Math.min(400, $q.screen.width * 0.9))

/*
 * Swipes: each Menu, Mini Cart and Mini Wishlist widget says whether its
 * drawer opens by swiping in from an edge (its "swipe": auto, none, left,
 * right). Automatic: menus from the start side of the screen, the cart and
 * wishlist from the end side. One drawer per edge: the first widget on the
 * page (header first) wins.
 */
const rtl = computed(() => !!$q.lang.rtl)
// The side a drawer belongs on: the edge its widget chose, else menus at the start, the rest at the end.
const screenSide = (key) => {
  const swipe = drawers.state.entries[key]?.swipe
  if (swipe === 'left' || swipe === 'right') return swipe
  return key.startsWith('menu:') !== rtl.value ? 'left' : 'right'
}
const edgeKeys = computed(() => {
  const edges = { left: '', right: '' }
  for (const key of drawers.state.order) {
    if ((drawers.state.entries[key]?.swipe || 'auto') === 'none') continue
    const edge = screenSide(key)
    if (!edges[edge]) edges[edge] = key
  }
  return edges
})
// Quasar mirrors a drawer's side on right-to-left pages.
const qSide = (key) => {
  const side = screenSide(key)
  return rtl.value ? (side === 'left' ? 'right' : 'left') : side
}

const drawerRefs = {}
const setDrawerRef = (key, component) => {
  if (component) drawerRefs[key] = component
  else delete drawerRefs[key]
}

let startX = 0
let startY = 0
let currentX = 0
let dragging = false
let activeDrawer = null // the drawer's key
// The edge of the screen it slides in from.
let activeEdge = null // 'left' | 'right'
let activeEl = null
let activeAside = null
let activeBackdrop = null
let activePointerId = null

const DRAG_ACTIVATION_DISTANCE = 10
const OPEN_THRESHOLD_RATIO = 0.35
const MAX_BACKDROP_OPACITY = 0.4 // matches Quasar's own default overlay darkness

const getEl = (key) => drawerRefs[key]?.$el || null
const getAside = (el) => el?.querySelector('aside') || null
const getBackdrop = (el) => el?.querySelector('.q-drawer__backdrop') || null

// closed: the drag ended with the drawer still closed, so the backdrop gets back
// the "hidden" class the drag took off (Quasar only sets it again when the drawer
// opens or closes; a transparent full-screen backdrop would block every click).
const resetDrag = (el, closed = false) => {
  if (!el) return
  const aside = getAside(el)
  const backdrop = getBackdrop(el)
  if (aside) {
    aside.style.transition = ''
    aside.style.transform = ''
    aside.style.visibility = ''
  }
  if (backdrop) {
    backdrop.style.transition = ''
    backdrop.style.backgroundColor = ''
    if (closed) backdrop.classList.add('hidden')
  }
}

// Swipes that start inside something that scrolls sideways (carousels, tables,
// tabs) scroll it instead of pulling in a drawer.
const inSidewaysScroller = (target) => {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1) {
      const overflow = getComputedStyle(el).overflowX
      if (overflow === 'auto' || overflow === 'scroll') return true
    }
  }
  return false
}

const handlePointerDown = (e) => {
  // Only left mouse button, ignore right-click/middle-click
  if (e.pointerType === 'mouse' && e.button !== 0) return
  if (drawers.state.open) return
  if (inSidewaysScroller(e.target)) {
    activePointerId = null
    return
  }

  startX = e.clientX
  startY = e.clientY
  currentX = startX
  dragging = false
  activeDrawer = null
  activeEdge = null
  activeEl = null
  activeAside = null
  activeBackdrop = null
  activePointerId = e.pointerId
}

const handlePointerMove = (e) => {
  if (activePointerId === null || e.pointerId !== activePointerId) return
  if (drawers.state.open) return

  const dx = e.clientX - startX
  const dy = e.clientY - startY

  if (!dragging) {
    if (Math.abs(dx) < DRAG_ACTIVATION_DISTANCE) return
    if (Math.abs(dy) > Math.abs(dx)) return // vertical scroll, bail

    dragging = true
    // A left-to-right swipe pulls in the drawer on the left edge of the screen.
    activeEdge = dx > 0 ? 'left' : 'right'
    activeDrawer = edgeKeys.value[activeEdge]
    activeEl = activeDrawer ? getEl(activeDrawer) : null
    if (!activeEl) {
      // Nothing opens from this edge.
      dragging = false
      activePointerId = null
      return
    }
    activeAside = getAside(activeEl)
    activeBackdrop = getBackdrop(activeEl)
    if (activeAside) activeAside.style.transition = 'none'
    if (activeBackdrop) {
      activeBackdrop.style.transition = 'none'
      activeBackdrop.style.display = '' // in case Quasar sets display:none when closed
    }
  }

  if (!dragging || !activeEl) return

  e.preventDefault()
  currentX = e.clientX

  const width = drawerWidth.value
  const dist = Math.min(width, Math.max(0, Math.abs(dx)))
  const progress = dist / width // 0 → 1
  const translate = activeEdge === 'left' ? dist - width : width - dist
  activeAside.style.transform = `translateX(${translate}px)`
  activeAside.style.visibility = 'visible'

  if (activeBackdrop) {
    activeBackdrop.style.backgroundColor = `rgba(0,0,0,${(progress * MAX_BACKDROP_OPACITY).toFixed(3)})`
    activeBackdrop.classList.remove('hidden')

  }
}

const handlePointerUp = (e) => {
  if (activePointerId === null || e.pointerId !== activePointerId) return
  activePointerId = null

  if (!dragging || !activeEl) {
    dragging = false
    return
  }

  const dist = Math.abs(currentX - startX)
  const width = drawerWidth.value
  const shouldOpen = dist > width * OPEN_THRESHOLD_RATIO
  const el = activeEl
  const drawer = activeDrawer
  const edge = activeEdge
  activeBackdrop = getBackdrop(el)

  el.querySelector('aside').style.transition = 'transform 0.2s ease-out'
  if (activeBackdrop) activeBackdrop.style.transition = 'background-color 0.2s ease-out'

  if (shouldOpen) {
    el.querySelector('aside').style.transform = 'translateX(0)'
    if (activeBackdrop) activeBackdrop.style.backgroundColor = `rgba(0,0,0,${MAX_BACKDROP_OPACITY})`

    // only the cleanup waits for the CSS transition to visually finish
    resetDrag(el)

    drawers.open(drawer)
  } else {
    el.querySelector('aside').style.transform = edge === 'left' ? `translateX(-${width}px)` : `translateX(${width}px)`
    if (activeBackdrop) {
      activeBackdrop.style.backgroundColor = 'rgba(0,0,0,0)'
      activeBackdrop.classList.add('hidden')

    }
    setTimeout(() => resetDrag(el, drawers.state.open !== drawer), 200)
  }

  dragging = false
  activeDrawer = null
  activeEdge = null
  activeEl = null
}
const handlePointerCancel = (e) => {
  if (activePointerId === null || e.pointerId !== activePointerId) return
  activePointerId = null

  if (dragging && activeEl) {
    // Snap back closed, don't leave it stranded. The browser cancels a swipe when
    // it starts scrolling the page or a carousel itself.
    resetDrag(activeEl, true)
  }

  dragging = false
  activeDrawer = null
  activeEdge = null
  activeEl = null
  activeAside = null
  activeBackdrop = null
}


async function handleSubscribe() {
  if (Platform.is.capacitor) {
    try {
      // request permission via the boot helper (user gesture)
      const result = await initNativePush()
      permission.value = normalizePermission(result)
      //alert('Permission status: ' + result)
    } catch (e) {
      console.error('Native permission error', e)
    }
  } else {
    await subscribeToWebPush()
    permission.value = Notification.permission
  }
}

async function handleSoftAskEnable() {
  await handleSubscribe()
  dismissNotificationSoftAsk()
}

const uiHydrated = ref(false)              // Deferred functional UI
const route = useRoute()
const router = useRouter()
if (process.env.SERVER) {
  // Which page this is, for the owner's custom code (src-ssr/custom-code.js).
  const ssr = useSSRContext()
  if (ssr) ssr.codeWhere = chromeTarget(route)
}
// Header / footer templates: the one chosen for this page, else the main one.
const shownHeader = computed(() => pickChrome(headerSettings.value, route))
const aboveHeader = computed(() => (shownHeader.value?.sections || []).filter((s) => s?.location === 'above'))
// Branding → Loading bar: app.css reads --qwoo-loading-bar (the bar only runs in the browser).
if (process.env.CLIENT) {
  watch(() => resolveGlobalColor(brandSettings.value?.loading_bar), (c) => {
    const root = document.documentElement.style
    if (c) root.setProperty('--qwoo-loading-bar', c)
    else root.removeProperty('--qwoo-loading-bar')
  }, { immediate: true })
}
const shownFooter = computed(() => pickChrome(footerSettings.value, route))

const noDelayRoutes = ['/checkout/', '/cart/', '/my-account/']

const shouldDelayHydration = computed(() => {
  return !noDelayRoutes.includes(stripLang(route.path))
})

const initConnectivityListeners = () => {
  if (window.__CONNECTIVITY_INITIALIZED__) return
  window.__CONNECTIVITY_INITIALIZED__ = true

  let wasOffline = !navigator.onLine

  const updateOnlineStatus = async (isOnline) => {
    const becameOnline  = isOnline && wasOffline
    const becameOffline = !isOnline && !wasOffline

    if (!becameOnline && !becameOffline) return  // no actual state change, bail early

    wasOffline = !isOnline
    cart.state.offline = !isOnline

    if (becameOnline) {
      $q.notify({ type: 'positive', message: t('You are back online!'), icon: matWifi, timeout: 3000 })
      await cart.fetchCart()
      await wishlist.fetchWishlistItems()
    } else {
      $q.notify({ type: 'warning', message: t('You are offline. Some features may be limited.'), icon: matSignalWifiOff, timeout: 3000 })
    }
  }

  window.addEventListener('online',  () => updateOnlineStatus(true))
  window.addEventListener('offline', () => updateOnlineStatus(false))
  // Catches physical network changes (WiFi toggle) that window events miss

  navigator.serviceWorker.addEventListener('message', ({ data }) => {
    if (data.type === 'OFFLINE') {
      updateOnlineStatus(false)
    } else if (data.type === 'ONLINE'){
      updateOnlineStatus(true)
    }
  });

  navigator.connection?.addEventListener('change', async () => {
    try {
      await fetch(window.location.origin, {method: 'HEAD', cache: 'no-store'})
      updateOnlineStatus(true)
    } catch {
      updateOnlineStatus(false)
    }
  })

}

onMounted(async () => {
  // The owner's tracking and custom code: right away (not after the first scroll like the rest).
  initCustomCode(router)
  // Signed in or not: the Account widget, the forms and "Show To" sections wait for it.
  checkSession()
  initSessionWatcher()

  const isPreview = route.query.preview === 'true'

  if (window.__BRAND_CONFIG__ && Object.keys(window.__BRAND_CONFIG__).length) {
    brandSettings.value = window.__BRAND_CONFIG__
  } else {
    // Use it directly
    const freshConfig = await loadPageConfig('branding', isPreview)
    if (freshConfig) brandSettings.value = freshConfig
  }
  if (window.__HEADER_CONFIG__ && Object.keys(window.__HEADER_CONFIG__).length) {
    headerSettings.value = window.__HEADER_CONFIG__
  } else {
    // Use it directly
    const freshHeaderConfig = await loadPageConfig('header', isPreview)
    if (freshHeaderConfig) headerSettings.value = freshHeaderConfig
  }
  if (window.__FOOTER_CONFIG__ && Object.keys(window.__FOOTER_CONFIG__).length) {
    footerSettings.value = window.__FOOTER_CONFIG__
  } else {
    // Use it directly
    const freshFooterConfig = await loadPageConfig('footer', isPreview)
    if (freshFooterConfig) footerSettings.value = freshFooterConfig
  }

  // The native app and the offline app shell have no server render: brand fonts are put on the page here.
  if (isNativeApp() || drawnHere) applyBrandFonts(brandSettings.value?.fonts, { url: liveUrl })

  // Live Preview (Shop Builder admin iframe) — no-op everywhere else,
  // since subscribeToLiveConfig() checks for ?qwoo_editor=1 internally.
  liveConfigUnsubscribers.push(
      subscribeToLiveConfig('branding', (data) => {
        brandSettings.value = data
        applyGlobalColors(data?.global_colors)
        // The preview's fonts come from Google's font server (not published yet).
        applyBrandFonts(data?.fonts || null, { remote: true })
      }),
      subscribeToLiveConfig('header', (data) => { headerSettings.value = data }),
      subscribeToLiveConfig('footer', (data) => { footerSettings.value = data })
  )

  if (!('serviceWorker' in navigator)) return
  const warm = () => {
    navigator.serviceWorker.ready.then(registration => {
      registration.active?.postMessage({ type: 'UPDATE_SW' })
    })
  }

  await router.isReady()

  const scheduler = async () => {
    if (uiHydrated.value) return
    window.removeEventListener('scroll', scheduler)
    window.removeEventListener('mousemove', scheduler)
    window.removeEventListener('touchstart', scheduler)


    try {
      requestAnimationFrame(() => {
        uiHydrated.value = true
        hideSplash()
        initConnectivityListeners()
        warm()

        cart.fetchCartOnce()
        initLoadingBar(router)
        initAuthPopup(router)
        // The store's push key and when to ask (dashboard → Notifications → Settings).
        getPushConfig().then((cfg) => {
          pushKeyReady.value = !!cfg.key
          softAskTexts.value = cfg.ask?.texts || null
          if (cfg.key) initNotificationSoftAskTracking(router, cfg.ask)
        })
        const code = typeof route.query.qwoo_push_owner === 'string' ? route.query.qwoo_push_owner : ''
        if (code && /^[a-z0-9]{24}$/.test(code) && !Platform.is.capacitor && 'Notification' in window) {
          ownerCode.value = code
          const query = { ...route.query }
          delete query.qwoo_push_owner
          router.replace({ query }).catch(() => {})
        }

        initPush({router})

        if (Platform.is.capacitor) {
          supported.value = true
          // keep only the native check, remove the web Notification.permission line below
          checkNativePermission().then(initialPermissions => {
            permission.value = normalizePermission(initialPermissions)
          })
        } else if ('Notification' in window) {
          const perm = normalizePermission(Notification.permission)
          permission.value = perm
          // If already granted, no need to show the banner or check incognito
          if (perm !== 'granted') {
            supported.value = true
          }
        }
        window.addEventListener('pointerdown', handlePointerDown, { passive: true })
        window.addEventListener('pointermove', handlePointerMove, { passive: false })
        window.addEventListener('pointerup', handlePointerUp, { passive: true })
        window.addEventListener('pointercancel', handlePointerCancel, { passive: true })
      })

    } catch (e) {
      console.error('Hydration prefetch failed', e)
      uiHydrated.value = true
    }

  }

  // A click in the header draws the drawers right away. The widget's own click
  // already asked for its drawer (useDrawers.js): it opens as soon as it's drawn.
  const headerBtnClick = () => scheduler()

  document.querySelector('header').addEventListener('click', headerBtnClick, { passive: true })

  if (!shouldDelayHydration.value) {
    scheduler()
  } else {
    const cleanup = () => {
      window.removeEventListener('scroll', scheduler)
      window.removeEventListener('mousemove', scheduler)
      window.removeEventListener('touchstart', scheduler)
      clearTimeout(fallbackTimer)
    }

    const fallbackTimer = setTimeout(() => {
      cleanup()
      scheduler()
    }, 5000)

    window.addEventListener('scroll', scheduler, { passive: true })
    window.addEventListener('mousemove', scheduler, { passive: true })
    window.addEventListener('touchstart', scheduler, { passive: true })
  }
})
onUnmounted(() => {
  // Critical cleanup
  window.removeEventListener('pointerdown', handlePointerDown)
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerCancel)

  liveConfigUnsubscribers.forEach(fn => fn())
  liveConfigUnsubscribers = []
})
watch(() => cart.state.drawerOpen, val => {
  if(val === true) {
    drawers.open('cart')
    cart.state.drawerOpen = false;
    //cart.fetchCart()
  }
})
watch(
    () => cart.state.rejected_items,
    (rejected) => {
      if (rejected?.length) {
        rejected.forEach(item => {
          $q.notify({
            type: 'warning',
            message: t('"{name}" was removed — no longer available', { name: item.name }),
            icon: matError,
            timeout: 8000
          })
        })
      }
    }
)

</script>