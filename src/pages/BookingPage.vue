<template>
  <div class="bkp q-pa-md">
    <div v-if="loading" class="q-pa-xl flex justify-center"><q-spinner color="secondary" size="3em" /></div>

    <div v-else-if="error && !b" class="bkp-card">
      <h1 class="text-h5">{{ t('This link doesn\'t work') }}</h1>
      <p>{{ error }}</p>
      <q-btn color="secondary" no-caps :label="t('Go to the store')" to="/" />
    </div>

    <div v-else-if="b" class="bkp-card">
      <p class="bkp-status" :class="`is-${b.status}`">{{ statusText }}</p>
      <h1 class="text-h5 q-my-sm">{{ b.service }}</h1>
      <dl class="bkp-rows">
        <template v-for="r in b.rows" :key="r.k">
          <dt>{{ r.k }}</dt>
          <dd><a v-if="r.link" :href="r.v" target="_blank" rel="noopener">{{ r.v }}</a><template v-else>{{ r.v }}</template></dd>
        </template>
      </dl>

      <div v-if="['confirmed', 'pending'].includes(b.status) && !moving && !cancelling" class="bkp-adds">
        <span>{{ t('Add to your calendar:') }}</span>
        <a :href="b.google" target="_blank" rel="noopener">Google</a>
        <a :href="b.outlook" target="_blank" rel="noopener">Outlook</a>
        <a v-if="b.ics" :href="b.ics">{{ t('Apple / other') }}</a>
      </div>

      <p v-if="notice" class="bkp-notice" role="status">{{ notice }}</p>
      <p v-if="error" class="bkp-problem" role="alert">{{ error }}</p>

      <!-- Move -->
      <div v-if="moving" class="bkp-box">
        <b>{{ t('Choose a new time') }}</b>
        <div class="bkp-days">
          <button v-for="day in openDays" :key="day" type="button" class="bkp-day" :class="{ on: day === date }" :aria-pressed="day === date" @click="date = day">
            <small>{{ dayPart(day, 'short') }}</small><b>{{ Number(day.slice(8)) }}</b>
          </button>
        </div>
        <p v-if="loadingTimes" class="bkp-note">{{ t('Looking for free times…') }}</p>
        <p v-else-if="!openDays.length" class="bkp-note">{{ t('No free times in the next weeks. Please contact us.') }}</p>
        <div v-if="date" class="bkp-times">
          <button v-for="s in days[date] || []" :key="s.start" type="button" class="bkp-time" :class="{ on: pick === s.start }" :aria-pressed="pick === s.start" @click="pick = s.start">{{ s.time }}</button>
        </div>
        <div class="bkp-actions">
          <q-btn color="secondary" no-caps unelevated :disable="!pick || busy" :loading="busy" :label="t('Move my booking')" @click="doMove" />
          <q-btn flat no-caps :label="t('Back')" @click="moving = false" />
        </div>
      </div>

      <!-- Cancel -->
      <div v-else-if="cancelling" class="bkp-box">
        <b>{{ t('Cancel this booking?') }}</b>
        <p v-if="b.paid" class="bkp-note">{{ b.refund === 'full' ? t('Your payment is refunded to the card you paid with.') : t('The payment isn\'t refunded.') }}</p>
        <div class="bkp-actions">
          <q-btn color="negative" no-caps unelevated :loading="busy" :label="t('Yes, cancel it')" @click="doCancel" />
          <q-btn flat no-caps :label="t('Keep my booking')" @click="cancelling = false" />
        </div>
      </div>

      <div v-else-if="['confirmed', 'pending'].includes(b.status)" class="bkp-actions">
        <q-btn v-if="b.can_move" outline color="secondary" no-caps :label="t('Move to another time')" @click="startMove" />
        <q-btn v-if="b.can_cancel" flat color="negative" no-caps :label="t('Cancel booking')" @click="cancelling = true" />
        <p v-if="!b.can_cancel" class="bkp-note">{{ t('It\'s less than {n} hours before your booking, so it can\'t be changed online. Please contact us.', { n: b.cancel_hours }) }}</p>
      </div>

      <q-btn class="q-mt-md" flat no-caps color="secondary" :label="t('Go to the store')" to="/" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMeta } from 'quasar'
import { useI18n, currentLocale } from 'src/i18n/index.js'
import { bookingApi, failText, ymdIn } from 'src/composables/useBooking.js'

/** A booking from the link in its emails (/booking/<id>?k=<key>): see it, move it, cancel it. Browser only. */
const { t } = useI18n()
const route = useRoute()
useMeta({ title: t('Your booking'), meta: { robots: { name: 'robots', content: 'noindex, nofollow', key: 'robots' } } })

const id = computed(() => Number(route.params.id) || 0)
const key = computed(() => String(route.query.k || ''))
const b = ref(null)
const loading = ref(true)
const error = ref('')
const notice = ref('')
const busy = ref(false)

async function load() {
  loading.value = true
  const res = await bookingApi.manage(id.value, key.value)
  b.value = res.ok ? res.data : null
  if (!res.ok) error.value = failText(res, t('This link doesn\'t open a booking. Check the link in your email.'))
  loading.value = false
}
onMounted(load)

const STATUS = { confirmed: 'Your booking is confirmed', pending: 'Waiting for your payment', done: 'This booking has passed', noshow: 'This booking has passed', cancelled: 'This booking was cancelled' }
const statusText = computed(() => t(STATUS[b.value?.status] || 'Your booking'))

/* Moving: the next 4 weeks of free times */
const moving = ref(false)
const cancelling = ref(false)
const days = ref({})
const date = ref('')
const pick = ref('')
const loadingTimes = ref(false)
const openDays = computed(() => Object.keys(days.value).filter((k) => days.value[k]?.length))
const dayPart = (ymd, weekday) => new Date(`${ymd}T12:00:00`).toLocaleDateString(currentLocale(), { weekday })
async function startMove() {
  moving.value = true
  error.value = ''
  loadingTimes.value = true
  const from = ymdIn(new Date(), b.value.tz)
  const to = ymdIn(new Date(Date.now() + 27 * 86400000), b.value.tz)
  const res = await bookingApi.times(b.value.service_id, from, to, b.value.seats)
  days.value = res.ok ? (res.data?.days || {}) : {}
  date.value = openDays.value[0] || ''
  loadingTimes.value = false
}
watch(date, () => { pick.value = '' })
async function doMove() {
  busy.value = true
  error.value = ''
  const res = await bookingApi.act(id.value, key.value, 'move', pick.value)
  busy.value = false
  if (!res.ok) { error.value = failText(res, t('Something went wrong. Please try again.')); return }
  b.value = res.data
  moving.value = false
  notice.value = t('Done. We emailed you the new time.')
}
async function doCancel() {
  busy.value = true
  error.value = ''
  const res = await bookingApi.act(id.value, key.value, 'cancel')
  busy.value = false
  if (!res.ok) { error.value = failText(res, t('Something went wrong. Please try again.')); return }
  b.value = res.data
  cancelling.value = false
  notice.value = t('Your booking is cancelled.')
}
</script>

<style scoped>
.bkp { display: flex; justify-content: center; }
.bkp-card { width: 100%; max-width: 560px; display: grid; gap: 10px; padding-block: 24px; }
.bkp-status { margin: 0; font-weight: 600; color: var(--q-secondary); }
.bkp-status.is-cancelled { color: var(--q-negative); }
.bkp-rows { display: grid; grid-template-columns: minmax(90px, 30%) minmax(0, 1fr); gap: 8px 12px; margin: 0; }
.bkp-rows dt { opacity: .7; }
.bkp-rows dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
.bkp-adds { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: .9em; }
.bkp-adds a { border: 1px solid rgba(127, 127, 127, .35); border-radius: 8px; padding: 6px 12px; color: inherit; text-decoration: none; font-weight: 600; }
.bkp-box { border: 1px solid rgba(127, 127, 127, .3); border-radius: 14px; padding: 14px; display: grid; gap: 10px; }
.bkp-days { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
.bkp-day { flex: none; width: 54px; border: 1px solid rgba(127, 127, 127, .35); border-radius: 12px; padding: 6px 0; background: transparent; color: inherit; display: grid; font: inherit; cursor: pointer; }
.bkp-day b { font-size: 1.15em; font-variant-numeric: tabular-nums; }
.bkp-day small { font-size: .7em; opacity: .7; }
.bkp-day.on, .bkp-time.on { background: var(--q-secondary); border-color: var(--q-secondary); color: #fff; }
.bkp-times { display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 6px; }
.bkp-time { border: 1px solid rgba(127, 127, 127, .35); border-radius: 10px; padding: 8px 4px; background: transparent; color: inherit; font: inherit; font-variant-numeric: tabular-nums; cursor: pointer; }
.bkp-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.bkp-note { margin: 0; font-size: .9em; opacity: .75; }
.bkp-notice { margin: 0; font-weight: 600; }
.bkp-problem { margin: 0; color: var(--q-negative); }
</style>
