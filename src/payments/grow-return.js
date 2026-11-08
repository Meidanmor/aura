// The trip to Grow's payment page and back. Before leaving, checkout remembers the order and the
// cart (placing the order empties it): if the shopper comes back to checkout without paying, the
// cart is put back. The store confirms a payment with Grow itself (qwoo-grow/v1/check). Cardcom
// payments take the same trip (qwoo-cardcom/v1/check).

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

/** Whether a payment method pays on another site and is checked this way (Grow, Cardcom). */
export const paysElsewhere = (pm) => /^(grow|cardcom)_/.test(String(pm || ''))

/** { paid, status } from the store (which asks Grow or Cardcom), or null when it can't say. */
export async function checkGrowPayment(orderId, key, pm = '') {
    const provider = String(pm).startsWith('cardcom_') ? 'qwoo-cardcom' : 'qwoo-grow'
    try {
        const res = await fetch(`/wp-json/${provider}/v1/check?order=${encodeURIComponent(orderId)}&key=${encodeURIComponent(key)}`, { credentials: 'include' })
        return res.ok ? await res.json() : null
    } catch {
        return null
    }
}

/** Asks until the payment is confirmed or about 30 seconds pass. True when paid. */
export async function waitForGrowPayment(orderId, key, { tries = 12, every = 2500, pm = '' } = {}) {
    for (let i = 0; i < tries; i++) {
        const r = await checkGrowPayment(orderId, key, pm)
        if (r?.paid) return true
        if (r && ['cancelled', 'failed', 'refunded'].includes(r.status)) return false
        await new Promise((done) => setTimeout(done, every))
    }
    return false
}
