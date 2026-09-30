// shared
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
}

export function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    return Uint8Array.from(rawData, c => c.charCodeAt(0))
}

export function getDeviceId() {
    let deviceId = localStorage.getItem('pwa_device_id')
    if (!deviceId) {
        deviceId = generateUUID()
        localStorage.setItem('pwa_device_id', deviceId)
    }
    return deviceId
}
const SUBSCRIBED_KEY = 'pwa_push_subscribed'

export async function saveSubscription(payload) {
    const res = await fetch('/wp-json/qwoo/v1/pwa/save-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    const json = await res.json()
    // Remember that this device has a subscription row on the server —
    // cart-token syncing is pointless (and skipped) until it does.
    if (res.ok && json?.success) {
        try { localStorage.setItem(SUBSCRIBED_KEY, '1') } catch { /* ignore */ }
    }
    return json
}

/**
 * Whether this device can receive push notifications, i.e. whether the
 * server has a subscription row whose cart token is worth keeping fresh.
 * Web users who subscribed before the flag existed are covered by the
 * granted-permission check.
 */
function isPushSubscribed() {
    try {
        if (localStorage.getItem(SUBSCRIBED_KEY) === '1') return true
    } catch { /* ignore */ }
    return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

/* ---------------------------------------------------------------------
   Cart-token sync (abandoned-cart reminders)

   The server needs two facts: "the app went to the background with this
   cart" (hidden → start the abandoned-cart clock) and "the user is back"
   (active → cancel it). Browsers fire several events for one real change
   (visibilitychange + focus + pageshow), so this only sends *transitions*:
     - nothing at all for devices without a push subscription;
     - "hidden" immediately (the page may be killed right after), and only
       if the state or cart token differs from what was last sent;
     - "active" after a short settle delay that swallows duplicate events,
       and only if the server was last told "hidden" (or this session
       hasn't told it anything yet).
   A failed request forgets the last-sent state so the next event retries.
   --------------------------------------------------------------------- */

const LAST_SENT_KEY = 'pwa_cart_sync_last'
const ACTIVE_SETTLE_MS = 800
let activeTimer = null

function readLastSent() {
    try { return JSON.parse(sessionStorage.getItem(LAST_SENT_KEY) || 'null') } catch { return null }
}
function writeLastSent(value) {
    try {
        if (value) sessionStorage.setItem(LAST_SENT_KEY, JSON.stringify(value))
        else sessionStorage.removeItem(LAST_SENT_KEY)
    } catch { /* ignore */ }
}

function sendCartState(status, cartToken) {
    const sent = { status, token: cartToken || null }
    writeLastSent(sent)
    return fetch('/wp-json/qwoo/v1/pwa/update-cart-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({ device_id: getDeviceId(), cart_token: cartToken, status })
    }).then((res) => {
        if (!res.ok) writeLastSent(null)
    }).catch((err) => {
        writeLastSent(null)
        console.error('❌ Failed to sync cart token:', err)
    })
}

/** Call on every visibility / app-state event; it decides whether to send. */
export function queueCartTokenSync(status = 'hidden') {
    if (!isPushSubscribed()) return

    let cartToken = null
    try { cartToken = localStorage.getItem('wc_cart_token') } catch { /* ignore */ }
    const last = readLastSent()

    if (status === 'hidden') {
        clearTimeout(activeTimer)
        activeTimer = null
        if (!cartToken) return
        if (last?.status === 'hidden' && last.token === cartToken) return
        sendCartState('hidden', cartToken)
        return
    }

    // 'active'
    clearTimeout(activeTimer)
    activeTimer = setTimeout(() => {
        activeTimer = null
        if (readLastSent()?.status === 'active') return
        sendCartState('active', cartToken)
    }, ACTIVE_SETTLE_MS)
}