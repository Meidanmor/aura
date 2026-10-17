// The trip to Grow's payment page and back. Before leaving, checkout remembers the order and the
// cart (placing the order empties it): if the shopper comes back to checkout without paying, the
// cart is put back. The store confirms a payment with Grow itself (qwoo-grow/v1/check).

const KEY = 'qwoo-grow-pending'
const MAX_AGE = 3 * 60 * 60 * 1000 // a payment page left open longer than this is forgotten

export function rememberGrowPayment(data) {
    try {
        localStorage.setItem(KEY, JSON.stringify({ ...data, at: Date.now() }))
    } catch { /* private mode: no cart to put back */ }
}

/** The payment the shopper left for ({ orderId, key, email, items }), once; null when none. */
export function takeGrowPayment() {
    try {
        const raw = localStorage.getItem(KEY)
        localStorage.removeItem(KEY)
        const data = raw ? JSON.parse(raw) : null
        return data && Date.now() - (data.at || 0) < MAX_AGE ? data : null
    } catch {
        return null
    }
}

/** { paid, status } from the store (which asks Grow), or null when it can't say. */
export async function checkGrowPayment(orderId, key) {
    try {
        const res = await fetch(`/wp-json/qwoo-grow/v1/check?order=${encodeURIComponent(orderId)}&key=${encodeURIComponent(key)}`, { credentials: 'include' })
        return res.ok ? await res.json() : null
    } catch {
        return null
    }
}

/** Asks until the payment is confirmed or about 30 seconds pass. True when paid. */
export async function waitForGrowPayment(orderId, key, { tries = 12, every = 2500 } = {}) {
    for (let i = 0; i < tries; i++) {
        const r = await checkGrowPayment(orderId, key)
        if (r?.paid) return true
        if (r && ['cancelled', 'failed', 'refunded'].includes(r.status)) return false
        await new Promise((done) => setTimeout(done, every))
    }
    return false
}
