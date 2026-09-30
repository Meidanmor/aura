// web
import { urlBase64ToUint8Array, getDeviceId, saveSubscription, queueCartTokenSync } from 'src/services/push/shared.js'
// your VAPID public key for web push
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_APP_PUBLIC_KEY

/**
 * Subscribe to push notifications (Web/PWA)
 */
export async function subscribeToWebPush() {
    //console.log('🚀 Push setup started (Web)')
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
        console.warn('🔴 Notification permission not granted.')
        return
    }

    try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        })

        const deviceId = getDeviceId()
        const cartToken = localStorage.getItem('wc_cart_token') || null

        await saveSubscription({
            device_id: deviceId,
            cart_token: cartToken,
            subscription: subscription
        })
    } catch (err) {
        console.error('❌ Push subscription failed (web):', err)
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