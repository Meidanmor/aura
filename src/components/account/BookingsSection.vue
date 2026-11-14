<template>
  <div class="bks">
    <div v-if="state.loading && !state.list.length" class="q-pa-md flex justify-center"><q-spinner color="secondary" size="2em" /></div>
    <p v-else-if="state.failed" class="bks-note">{{ t('We couldn\'t load your bookings. Please try again.') }}</p>
    <p v-else-if="!state.list.length" class="bks-note">{{ t('You have no bookings yet.') }}</p>
    <template v-else>
      <h3 v-if="upcoming.length" class="bks-h">{{ t('Upcoming') }}</h3>
      <router-link v-for="b in upcoming" :key="b.id" class="bks-row" :to="link(b)">
        <span class="bks-date"><b>{{ dayNum(b) }}</b><small>{{ monthShort(b) }}</small></span>
        <span class="bks-main"><b>{{ b.service }}</b><small>{{ when(b) }}<template v-if="b.place"> · {{ b.place }}</template></small></span>
        <span class="bks-pill" :class="`is-${b.status}`">{{ t(STATUS[b.status] || b.status) }}</span>
      </router-link>
      <h3 v-if="past.length" class="bks-h">{{ t('Past') }}</h3>
      <router-link v-for="b in past" :key="b.id" class="bks-row is-past" :to="link(b)">
        <span class="bks-date"><b>{{ dayNum(b) }}</b><small>{{ monthShort(b) }}</small></span>
        <span class="bks-main"><b>{{ b.service }}</b><small>{{ when(b) }}</small></span>
        <span class="bks-pill" :class="`is-${b.status}`">{{ t(STATUS[b.status] || b.status) }}</span>
      </router-link>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n, currentLocale } from 'src/i18n/index.js'
import { useMyBookings } from 'src/composables/useMyBookings.js'

/** My account → Appointments: the shopper's bookings; each opens its own page (move, cancel). */
const { t } = useI18n()
const { state } = useMyBookings()
const STATUS = { confirmed: 'Confirmed', pending: 'Waiting for payment', done: 'Done', noshow: 'Missed', cancelled: 'Cancelled' }
const isUpcoming = (b) => ['confirmed', 'pending'].includes(b.status) && new Date(b.start).getTime() > Date.now()
const upcoming = computed(() => state.list.filter(isUpcoming).sort((a, b) => a.start.localeCompare(b.start)))
const past = computed(() => state.list.filter((b) => !isUpcoming(b)))
const at = (b) => new Date(b.local.replace(' ', 'T'))
const dayNum = (b) => at(b).getDate()
const monthShort = (b) => at(b).toLocaleDateString(currentLocale(), { month: 'short' })
const when = (b) => `${at(b).toLocaleDateString(currentLocale(), { weekday: 'long' })}, ${b.local.slice(11, 16)}`
const link = (b) => (b.key ? `/booking/${b.id}?k=${b.key}` : '/my-account/appointments')
</script>

<style scoped>
.bks { display: grid; gap: 8px; }
.bks-h { font-size: 1em; font-weight: 600; margin: 10px 0 2px; opacity: .75; }
.bks-note { opacity: .75; }
.bks-row { display: flex; align-items: center; gap: 14px; border: 1px solid rgba(127, 127, 127, .3); border-radius: 12px; padding: 10px 14px; color: inherit; text-decoration: none; }
.bks-row.is-past { opacity: .7; }
.bks-date { width: 46px; display: grid; text-align: center; flex: none; }
.bks-date b { font-size: 1.3em; font-variant-numeric: tabular-nums; line-height: 1.1; }
.bks-date small { font-size: .75em; opacity: .7; }
.bks-main { flex: 1; display: grid; min-width: 0; }
.bks-main small { opacity: .7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bks-pill { font-size: .75em; font-weight: 600; border-radius: 99px; padding: 2px 10px; background: rgba(127, 127, 127, .15); white-space: nowrap; }
.bks-pill.is-confirmed { background: color-mix(in srgb, var(--q-positive) 18%, transparent); }
.bks-pill.is-cancelled { background: color-mix(in srgb, var(--q-negative) 15%, transparent); }
</style>
