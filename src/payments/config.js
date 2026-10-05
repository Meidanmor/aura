import { ref } from 'vue'

// What checkout needs from the store, loaded once per visit: Stripe's
// publishable key (each store has its own Stripe account) and the names,
// notes and bank details the owner set for each payment method.
//   { stripe: { publishable_key, test } | null,
//     methods: { stripe|cod|bacs: { title, description, instructions?, accounts? } } }
export const paymentConfig = ref(null)

let loading = null

export function loadPaymentConfig() {
    if (typeof window === 'undefined') return Promise.resolve(null)
    if (!loading) {
        loading = fetch('/wp-json/qwoo/v1/payment-config', { credentials: 'include' })
            .then(res => (res.ok ? res.json() : null))
            .catch(() => null)
            .then(data => {
                const ok = !!data && typeof data === 'object'
                paymentConfig.value = ok ? data : { stripe: null, methods: {} }
                if (!ok) loading = null // try again next time
                return ok ? data : null // null: the store couldn't say
            })
    }
    return loading
}
