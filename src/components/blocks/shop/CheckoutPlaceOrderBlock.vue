<template>
  <div v-if="c?.ready" class="checkout-place-order" :class="{ 'is-full': d.full_width }">
    <div v-if="d.show_total !== false">
      <div v-if="c.couponApplied">{{ t('Total discount: {amount}', { amount: formatCurrency(c.cartTotalDiscount) }) }}</div>
      <div class="text-h6">{{ t('Total:') }} <span v-if="c.couponApplied"><del>{{ formatCurrency(Number(c.cartTotalDiscount) + Number(c.cartTotal)) }}</del></span> {{ formatCurrency(c.cartTotal) }}</div>
    </div>
    <div v-if="c.lastStep && ((c.allowSignup && c.isLoggedIn === false && !c.signupInContact) || (c.termsRequired && !asLine) || (c.marketingOptin?.on && !c.marketingInContact))" class="checkout-agree">
      <q-checkbox v-if="c.allowSignup && c.isLoggedIn === false && !c.signupInContact" v-model="c.createAccount" color="secondary" :label="t('Create an account (we\'ll email you a link to set your password)')" />
      <q-checkbox v-if="c.marketingOptin?.on && !c.marketingInContact" v-model="c.wantsMarketing" color="secondary" :label="c.marketingOptin.text" />
      <q-checkbox v-if="c.termsRequired && !asLine" v-model="c.agreeTerms" color="secondary">
        <!-- Parts on one line: their spaces are data, so Vue can't drop them (it trims spaces at the
             edges of <template> blocks and between tags on separate lines: "תנאי השימושואתמדיניות"). -->
        <span class="checkout-terms"><template v-for="(p, i) in termsParts" :key="i"><a v-if="p.to" :href="p.to" :target="inTab ? '_blank' : undefined" rel="noopener" @click.stop="openLegal($event, p.to)">{{ p.text }}</a><template v-else>{{ p.text }}</template></template>{{ ' *' }}</span>
      </q-checkbox>
    </div>
    <!-- The checkout in steps: Continue until the last step, and Back. -->
    <div class="checkout-place-order__buttons">
      <q-btn v-if="c.stepsOn && c.stepIndex > 0" flat no-caps class="checkout-back-btn" :label="t('Back')" @click="c.goStep(c.stepIndex - 1)" />
      <q-btn class="place-order-btn" :label="c.lastStep ? d.button_label || t('Place Order') : d.continue_label || t('Continue')" :color="buttonBg ? undefined : 'secondary'" :style="buttonColors" :disable="c.cart.state.offline" @click="c.placeOrder" />
    </div>
    <!-- Terms as a line under the button (no box): placing the order is agreeing, like the platform's sign-up. -->
    <p v-if="c.lastStep && c.termsRequired && asLine" class="checkout-terms checkout-terms--line"><template v-for="(p, i) in termsParts" :key="i"><a v-if="p.to" :href="p.to" :target="inTab ? '_blank' : undefined" rel="noopener" @click.stop="openLegal($event, p.to)">{{ p.text }}</a><template v-else>{{ p.text }}</template></template></p>
    <LegalPagePopup v-if="!inTab" v-model:path="legalOpen" />
  </div>
</template>

<script setup>
import { computed, inject, ref, watchEffect } from 'vue'
import { formatCurrency } from 'src/utils/formatters.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { useI18n } from 'src/i18n/index.js'
import LegalPagePopup from 'components/checkout/LegalPagePopup.vue'

/** "Place Order" (checkout page template): the total (unless an Order Totals block shows it), the account and terms boxes, and the button. */
const props = defineProps({ data: { type: Object, required: true }, blockId: { type: String, default: '' }, page: { type: String, default: '' } })
const { t } = useI18n()
const c = inject('checkoutPage', null)
const d = computed(() => props.data.data || {})
const buttonBg = computed(() => resolveGlobalColor(d.value.button_bg))
const buttonColors = computed(() => ({ ...(buttonBg.value ? { background: buttonBg.value } : {}), ...(d.value.button_text ? { color: resolveGlobalColor(d.value.button_text) } : {}) }))

const asLine = computed(() => d.value.terms_look === 'line')
const inTab = computed(() => d.value.terms_open === 'tab')
// No box to tick: the order carries the agreement (the store records it on the order).
watchEffect(() => { if (c && asLine.value) c.agreeTerms = true })

// The built-in sentences, by look and by which pages the store has.
const TEXTS = {
  box: {
    both: 'I have read and agree to the {terms} and the {privacy} of this store.',
    terms: 'I have read and agree to the {terms} of this store.',
    privacy: 'I have read and agree to the {privacy} of this store.',
  },
  line: {
    both: 'By placing your order, you agree to the {terms} and the {privacy} of this store.',
    terms: 'By placing your order, you agree to the {terms} of this store.',
    privacy: 'By placing your order, you agree to the {privacy} of this store.',
  },
}
/** The sentence as parts: [{ text }, { text, to }…]. The owner's own text marks the links with {terms} / {privacy}. */
const termsParts = computed(() => {
  const legal = c?.legal || {}
  const which = legal.terms && legal.privacy ? 'both' : legal.terms ? 'terms' : 'privacy'
  const own = String(d.value.terms_text || '').trim()
  const text = own || t(TEXTS[asLine.value ? 'line' : 'box'][which])
  const links = { terms: [legal.terms, t('terms and conditions')], privacy: [legal.privacy, t('privacy policy')] }
  return text.split(/(\{terms\}|\{privacy\})/).filter(Boolean).map((s) => {
    const key = s === '{terms}' ? 'terms' : s === '{privacy}' ? 'privacy' : ''
    if (!key) return { text: s }
    const [to, label] = links[key]
    // A page the store doesn't have (yet): its name, without a link.
    return to ? { text: label, to } : { text: label }
  })
})

const legalOpen = ref('')
/** Popup (the default) unless the owner chose a new tab; Ctrl / ⌘ / Shift click still opens a tab. */
function openLegal(e, to) {
  if (inTab.value || e.ctrlKey || e.metaKey || e.shiftKey || e.button > 0) return
  e.preventDefault()
  legalOpen.value = to
}
</script>

<style scoped>
/* The card itself ("In a card") is the block wrapper's .sb-card. */
.checkout-place-order { display: flex; flex-direction: column; gap: 12px; }
.checkout-place-order__buttons { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.is-full .place-order-btn { flex: 1 1 100%; }
.is-full .checkout-back-btn { order: 2; }
.checkout-terms a { color: inherit; text-decoration: underline; }
.checkout-terms--line { margin: 0; font-size: 13px; opacity: .8; }
</style>
