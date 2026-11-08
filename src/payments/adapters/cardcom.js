// Cardcom (Israeli stores): one checkout option per way to pay, all on Cardcom's payment page.
// The store answers the order with the page's address (payment_result.redirect_url). Checkout
// sends the shopper there (redirects: true), or, for cards when the owner chose "inside the
// checkout" (payment-config display: 'frame'), opens it in a window over the checkout.
import { paymentConfig } from '../config'

// Cardcom's payment pages only, over https.
const CARDCOM_HOSTS = /(^|\.)(cardcom\.solutions|cardcom\.co\.il)$/

function cardcomAdapter(key, label) {
    const id = `cardcom_${key}`
    return {
        id,
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
                ok = u.protocol === 'https:' && CARDCOM_HOSTS.test(u.hostname)
            } catch { ok = false }
            if (!ok) throw new Error("The payment page couldn't be opened. Please try again or choose another payment method.")
            return paymentConfig.value?.methods?.[id]?.display === 'frame' ? { frame: url } : { redirect: url }
        },
    }
}

export default [
    cardcomAdapter('card', 'Credit card'),
    cardcomAdapter('bit', 'Bit'),
    cardcomAdapter('applepay', 'Apple Pay'),
    cardcomAdapter('googlepay', 'Google Pay'),
]
