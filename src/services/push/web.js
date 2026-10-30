// web
import { urlBase64ToUint8Array, getDeviceId, saveSubscription, queueCartTokenSync, getPushConfig, setPushSources } from 'src/services/push/shared.js'
import cart from 'src/stores/cart'
import wishlist from 'src/stores/wishlist'

/**
 * Subscribe to push notifications (Web/PWA). The push key comes from the store
 * (dashboard → Notifications), else from the build. ownerCode: the owner's test
 * link (this device then gets the owner's test notifications).
 * Returns whether the device is subscribed now.
 */
export async function subscribeToWebPush({ ownerCode = '' } = {}) {
    const { key } = await getPushConfig()
    if (!key) return false
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
        console.warn('🔴 Notification permission not granted.')
        return false
    }

    try {
        const registration = await navigator.serviceWorker.ready
        const applicationServerKey = urlBase64ToUint8Array(key)
        let subscription = await registration.pushManager.getSubscription()
        // A subscription made with another key (an older build's) can't receive this store's messages.
        const oldKey = subscription?.options?.applicationServerKey
        if (subscription && oldKey && btoa(String.fromCharCode(...new Uint8Array(oldKey))) !== btoa(String.fromCharCode(...applicationServerKey))) {
            await subscription.unsubscribe()
            subscription = null
        }
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
        }

        const deviceId = getDeviceId()
        const cartToken = localStorage.getItem('wc_cart_token') || null

        const res = await saveSubscription({
            device_id: deviceId,
            cart_token: cartToken,
            subscription: subscription,
            ...(ownerCode ? { owner_code: ownerCode } : {})
        })
        return !!res?.success
    } catch (err) {
        console.error('❌ Push subscription failed (web):', err)
        return false
    }
}

export async function checkNativePermission() {
    return 'unsupported'
}
export async function initNativePush() {
    return 'unsupported'
}

/* -------------------------
   Boot init that sets up tracking & listeners
   — this is called by Quasar boot (default export)
   ------------------------- */
function setupCartTracking() {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            queueCartTokenSync('hidden')
        } else {
            queueCartTokenSync('active')
        }
    })

    // Belt-and-suspenders for mobile PWAs where visibilitychange can be flaky
    window.addEventListener('focus', () => queueCartTokenSync('active'))
    window.addEventListener('pageshow', () => queueCartTokenSync('active'))
    // iOS Safari doesn't always fire visibilitychange when a PWA is closed.
    // Duplicate events are free — queueCartTokenSync() only sends changes.
    window.addEventListener('pagehide', () => queueCartTokenSync('hidden'))
}


/**
 * Init push + cart tracking
 */
export default ({ router } = {}) => {
    // 1. Prevent server-side execution
    if (typeof window === 'undefined') return
    if (router) window.$router = router

    const initCarTracking = async () => {
        setPushSources({
            cartCount: () => Number(cart.state.items_count) || 0,
            wishlist: () => wishlist.state.items.map((p) => Number(p.id)).filter(Boolean),
        })
        setupCartTracking()
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data?.action === 'navigate' && event.data.url) {
                    if (window.$router) {
                        window.$router.push(event.data.url).catch(() => {
                            window.location.href = event.data.url
                        })
                    } else {
                        window.location.href = event.data.url
                    }
                }
            })
        }

        //console.log('✅ Push & Tracking initialized after LCP')
    }
    initCarTracking()
}