import { ref, nextTick } from 'vue'

// By default the soft-ask shows on the 3rd page view within this browser session
// (initial load counts as view #1). The store's settings can change when (see below).
const TRIGGER_AT_NAV_COUNT = 3

const NAV_COUNT_KEY = 'qwoo_nav_count'
const DISMISSED_KEY = 'qwoo_notif_soft_ask_dismissed'

export const showNotificationSoftAsk = ref(false)

// Whether the store can send notifications (it has a push key; the store's answer, else the build's),
// and the owner's texts for the ask (null: the built-in ones). Set by MainLayout from getPushConfig().
export const pushKeyReady = ref(!!import.meta.env.VITE_VAPID_APP_PUBLIC_KEY)
export const softAskTexts = ref(null)

let initialized = false

/**
 * Starts counting page views for the current browser session and flips
 * `showNotificationSoftAsk` on once the threshold is hit. Counting resets
 * each new tab/session (sessionStorage), and once dismissed it won't show
 * again for the rest of that session. The caller is still responsible for
 * also checking permission/support/VAPID-configured state before actually
 * rendering the modal — this composable only tracks "have they browsed
 * enough to ask."
 */
export function initNotificationSoftAskTracking(router, ask = {}) {
    if (initialized || typeof window === 'undefined') return
    initialized = true

    const alreadyDismissed = () => sessionStorage.getItem(DISMISSED_KEY) === '1'
    const show = () => {
        if (!alreadyDismissed()) showNotificationSoftAsk.value = true
    }

    // The owner's choice (dashboard → Notifications → Settings): after a few pages, after
    // adding to the cart, after some seconds on the store, or never by itself.
    const when = ask.when || 'views'
    if (when === 'never') return
    if (when === 'cart') {
        window.addEventListener('qwoo:add_to_cart', () => setTimeout(show, 1200))
        return
    }
    if (when === 'seconds') {
        setTimeout(show, Math.max(3, Number(ask.seconds) || 20) * 1000)
        return
    }

    const threshold = Math.max(1, Number(ask.views) || TRIGGER_AT_NAV_COUNT)
    const bump = () => {
        if (alreadyDismissed() || showNotificationSoftAsk.value) return

        const count = Number(sessionStorage.getItem(NAV_COUNT_KEY) || '0') + 1
        sessionStorage.setItem(NAV_COUNT_KEY, String(count))

        if (count >= threshold) {
            showNotificationSoftAsk.value = true
        }
    }

    bump() // counts the current/initial page as view #1
    router.afterEach(() => {
        nextTick(() => {
            bump()
        })
    })
}

export function dismissNotificationSoftAsk() {
    showNotificationSoftAsk.value = false
    if (typeof window !== 'undefined') {
        sessionStorage.setItem(DISMISSED_KEY, '1')
    }

}