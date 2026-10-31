import { computed, ref } from 'vue'
import cart from 'src/stores/cart'
import { fetchWithToken } from 'src/composables/useApiFetch.js'
import { formatCurrency } from 'src/utils/formatters.js'
import { t } from 'src/i18n/index.js'

/**
 * The cart's totals, shipping choice and codes. `cartOf`: the cart to read (the cart and
 * checkout pages pass the Store builder preview's sample cart while it's on; see sample-cart.js).
 */
export function useCartSummary(cartOf = () => cart) {
    const couponCode = ref('')
    const couponError = ref(null)
    const selectedShippingRateId = ref(null)
    const loadingCoupon = ref(false)

    const displayCart = computed(() => {
        return {
            items: cartOf().state.items,
            items_count: String(cartOf().state.items_count),
            coupons: cartOf().state.coupons || [],
            shipping_rates: cartOf().state.cart_array?.shipping_rates || [],
            payment_methods: cartOf().state.cart_array?.payment_methods || ['cod'],
            billing_address:
                cartOf().state.cart_array?.billing_address ||
                cartOf().state.local_cart.billing_address ||
                {},
            shipping_address:
                cartOf().state.cart_array?.shipping_address ||
                cartOf().state.local_cart.shipping_address ||
                {},
            totals: cartOf().state.totals,
            _offline: cartOf().state.offline,
            // Handy flag for the UI if you ever want to show a subtle
            // "estimated" indicator while waiting on server confirmation
            _local: !!cartOf().state.totals?._local
        }
    })

    const itemsCount = computed(() => displayCart.value?.items_count || '0')
    const cartItems = computed(() => displayCart.value?.items || [])

    const cartTotal = computed(() => {
        const total = displayCart.value?.totals?.total_price || '0'
        return total
    })
    const cartItemsTotal = computed(() => {
        const itemsTotal = displayCart.value?.totals?.total_items || '0'
        return itemsTotal
    })
    const cartTotalDiscount = computed(() => {
        const totalDiscount = displayCart.value?.totals?.total_discount || '0'
        return totalDiscount
    })

    const couponApplied = computed(() => displayCart.value?.coupons?.length > 0)

    const shippingOptions = computed(() => {
        const rates = displayCart.value?.shipping_rates?.[0]?.shipping_rates || []
        return rates.map(rate => ({
            label: `${rate.name} – ${formatCurrency(rate.price)}`,
            value: rate.rate_id
        }))
    })

    const fetchShippingRates = async () => {
        if (!cartOf().state.cart_array) return

        const rates = cartOf().state.cart_array.shipping_rates?.[0]?.shipping_rates || []
        if (!rates.length) return

        const selectedRate = rates.find(r => r.selected) || rates[0]
        selectedShippingRateId.value = selectedRate.rate_id
    }

    const onShippingMethodChange = async (newRateId) => {
        // Delivery prices come from the store: offline the choice stays as it was.
        // The preview's sample cart only moves the choice.
        if (cartOf().sample || cartOf().isOffline()) return
        cartOf().state.loading.cart = true
        try {
            const res = await fetchWithToken('/wp-json/wc/store/v1/cart/select-shipping-rate', {
                method: 'POST',
                body: JSON.stringify({ package_id: 0, rate_id: newRateId })
            })

            if(res.ok){
                cartOf().applyCheckoutCart(await res.json())
            } else {
                await cartOf().fetchCart(true)
            }
        } catch (error) {
            console.error('Error updating shipping method:', error)
        } finally {
            cartOf().state.loading.cart = false
        }
    }

    const applyCoupon = async (coupon) => {
        if(!coupon) {
            couponError.value = t('Please type a coupon')
            return
        }
        if (cartOf().sample) return

        loadingCoupon.value = true
        couponError.value = null
        try {
            await cartOf().applyCoupon(coupon)
        } catch (err) {
            couponError.value = t(err.message || 'Failed to apply coupon')
        } finally {
            loadingCoupon.value = false
        }
    }

    const removeCoupon = async (coupon) => {
        if (cartOf().sample) return
        try {
            await cartOf().removeCoupon(coupon)
        } catch (err) {
            couponError.value = t(err.message || 'Failed to remove coupon')
        }
    }

    return {
        displayCart, itemsCount, cartItems, cartTotal, cartItemsTotal, cartTotalDiscount, couponApplied,
        shippingOptions, selectedShippingRateId, couponCode, couponError,
        fetchShippingRates, onShippingMethodChange, applyCoupon, removeCoupon, loadingCoupon
    }
}