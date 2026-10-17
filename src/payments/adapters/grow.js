// Grow (Israeli stores): one checkout option per way to pay, all on Grow's own payment page.
// The store answers the order with the page's address (payment_result.redirect_url); checkout
// sends the shopper there (redirects: true), and the thank-you page waits for Grow's confirmation.

// Grow's payment pages only, over https.
const GROW_HOSTS = /(^|\.)(meshulam\.co\.il|grow\.link|grow\.business)$/

function growAdapter(key, label) {
    return {
        id: `grow_${key}`,
        label,
        component: null,
        redirects: true,
        async getPaymentData() {
            return []
        },
        async handlePaymentResult(response) {
            const url = response?.payment_result?.redirect_url || ''
            let ok = false
            try {
                const u = new URL(url)
                ok = u.protocol === 'https:' && GROW_HOSTS.test(u.hostname)
            } catch { ok = false }
            if (!ok) throw new Error("The payment page couldn't be opened. Please try again or choose another payment method.")
            return { redirect: url }
        },
    }
}

export default [
    growAdapter('card', 'Credit card'),
    growAdapter('bit', 'Bit'),
    growAdapter('applepay', 'Apple Pay'),
    growAdapter('googlepay', 'Google Pay'),
]
