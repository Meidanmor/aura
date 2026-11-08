<template>
  <div class="my-gc">
    <div v-if="!mounted || (gc.state.loading && !gc.hasAny.value)" class="my-gc__wait"><q-spinner size="26px" /></div>
    <p v-else-if="gc.state.failed" class="text-negative">{{ t('Your gift cards couldn\'t be loaded. Try again in a moment.') }}</p>
    <p v-else-if="!gc.hasAny.value" class="my-gc__empty">{{ t('No gift cards yet.') }}</p>
    <template v-else>
      <section v-if="gc.state.received.length">
        <h3 class="my-gc__h">{{ t('Sent to you') }}</h3>
        <ul class="my-gc__list">
          <li v-for="(c, i) in gc.state.received" :key="`r${i}`" class="my-gc__card">
            <div class="my-gc__top">
              <span class="my-gc__code" dir="ltr">•••• {{ c.last4 }}</span>
              <span class="my-gc__state" :class="`is-${c.state}`">{{ stateLabel(c.state) }}</span>
            </div>
            <div class="my-gc__balance">{{ t('{balance} left of {amount}', { balance: c.balance, amount: c.amount }) }}</div>
            <div class="my-gc__meta">
              <span v-if="c.from">{{ t('From {name}', { name: c.from }) }}</span>
              <span>{{ c.expires ? t('Valid until {date}', { date: c.expires }) : t('Never expires') }}</span>
            </div>
          </li>
        </ul>
        <p class="my-gc__fine">{{ t('Use the code from the gift card email at checkout.') }}</p>
      </section>
      <section v-if="gc.state.bought.length">
        <h3 class="my-gc__h">{{ t('You gave') }}</h3>
        <ul class="my-gc__list">
          <li v-for="(c, i) in gc.state.bought" :key="`b${i}`" class="my-gc__card">
            <div class="my-gc__top">
              <b>{{ t('To {name}', { name: c.to_name }) }}</b>
              <span>{{ c.amount }}</span>
            </div>
            <div class="my-gc__meta">
              <span v-if="c.email === 'problem'" class="text-negative">{{ t('We couldn\'t deliver it. Contact us to fix the address.') }}</span>
              <span v-else-if="c.email === 'scheduled'">{{ t('Will be sent on {date}', { date: c.when }) }}</span>
              <span v-else>{{ t('Sent on {date}', { date: c.when }) }}</span>
              <span v-if="c.order">{{ t('Order #{n}', { n: c.order }) }}</span>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { t } from 'src/i18n/index.js'
import { useMyGiftCards } from 'src/composables/useMyGiftCards.js'

/** My account → Gift cards: cards sent to the shopper and cards they bought (codes masked). */
const gc = useMyGiftCards()
const mounted = ref(false)
onMounted(() => { mounted.value = true; gc.reload() })
const stateLabel = (s) => ({ active: t('Active'), used: t('Used up'), expired: t('Expired'), off: t('Not active') }[s] || s)
</script>

<style scoped>
.my-gc__wait { display: grid; place-items: center; min-height: 120px; }
.my-gc__h { font-size: 1.05rem; font-weight: 600; margin: 0 0 10px; }
.my-gc__list { list-style: none; margin: 0 0 16px; padding: 0; display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
.my-gc__card { border: 1px solid rgba(0, 0, 0, .12); border-radius: 12px; padding: 14px; display: grid; gap: 6px; }
.my-gc__top { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.my-gc__code { font-family: ui-monospace, Menlo, Consolas, monospace; letter-spacing: .08em; }
.my-gc__state { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 99px; background: rgba(0, 0, 0, .06); }
.my-gc__state.is-active { background: #e6f7ef; color: #11704b; }
.my-gc__balance { font-size: 1.1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.my-gc__meta { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 13px; opacity: .75; }
.my-gc__fine, .my-gc__empty { font-size: 14px; opacity: .75; }
</style>
