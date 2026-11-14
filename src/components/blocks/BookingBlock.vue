<template>
  <div class="qbk" :class="[`qbk--${layout}`]" :style="vars">
    <div v-if="title" class="qbk__title" :class="titleText.class" :style="titleText.style">{{ title }}</div>

    <!-- The server draws the frame only: free times load in the browser (they change every minute). -->
    <div v-if="!mounted || loading" class="qbk__card qbk__loading" aria-hidden="true"><span /><span /><span /></div>
    <div v-else-if="!info || !info.enabled || !list.length" class="qbk__card qbk__closed" :class="bodyText.class" :style="bodyText.style">
      {{ problem || t('Booking isn\'t open right now. Please check back soon.') }}
    </div>

    <template v-else>
      <ol class="qbk__steps" :aria-label="t('Steps')">
        <li v-for="(s, n) in stepNames" :key="s.key" :class="{ on: step === s.key, done: n < stepIndex }">{{ s.label }}</li>
      </ol>

      <!-- 1. The service -->
      <div v-if="step === 'service'" class="qbk__services">
        <button v-for="s in list" :key="s.id" type="button" class="qbk__card qbk__svc" @click="chooseService(s)">
          <span v-if="s.image" class="qbk__pic" :style="{ backgroundImage: `url(${s.image})` }" />
          <span class="qbk__svc-text">
            <b :class="titleText.class">{{ s.name }}</b>
            <small>{{ facts(s) }}</small>
            <span v-if="d.show_description !== false && s.description" class="qbk__desc" :class="bodyText.class" :style="bodyText.style">{{ s.description }}</span>
          </span>
          <span class="qbk__go" aria-hidden="true"><span class="qbk__flip">›</span></span>
        </button>
      </div>

      <!-- 2. Day and time -->
      <div v-else-if="step === 'time'" class="qbk__grid">
        <div class="qbk__card">
          <div class="qbk__sum">
            <span v-if="svc.image" class="qbk__pic" :style="{ backgroundImage: `url(${svc.image})` }" />
            <div><b>{{ svc.name }}</b><small>{{ facts(svc) }}</small></div>
            <button v-if="!fixedService" type="button" class="qbk__link" @click="backToServices">{{ t('Change') }}</button>
          </div>

          <div class="qbk__mon-h">
            <button type="button" class="qbk__arrow" :aria-label="t('Previous month')" :disabled="!canBack" @click="shiftMonth(-1)"><span class="qbk__flip">‹</span></button>
            <b>{{ monthLabel }}</b>
            <button type="button" class="qbk__arrow" :aria-label="t('Next month')" @click="shiftMonth(1)"><span class="qbk__flip">›</span></button>
          </div>
          <div class="qbk__mon">
            <div class="qbk__days" role="grid" :aria-label="monthLabel">
              <span v-for="w in weekdays" :key="w" class="qbk__wd" role="columnheader">{{ w }}</span>
              <span v-for="n in lead" :key="`l${n}`" />
              <button
                v-for="c in cells" :key="c.ymd" type="button" class="qbk__day"
                :class="{ on: c.ymd === date, open: c.open }" :disabled="!c.open" :aria-pressed="c.ymd === date" :aria-label="c.label"
                @click="date = c.ymd"
              >{{ c.n }}</button>
            </div>
          </div>
          <!-- Phones: a row of days that scrolls sideways. -->
          <div class="qbk__strip">
            <button
              v-for="c in openCells" :key="`s${c.ymd}`" type="button" class="qbk__sday" :class="{ on: c.ymd === date }" :aria-pressed="c.ymd === date" :aria-label="c.label"
              @click="date = c.ymd"
            ><small>{{ c.wd }}</small><b>{{ c.n }}</b></button>
          </div>
          <p v-if="loadingTimes" class="qbk__note">{{ t('Looking for free times…') }}</p>
          <p v-else-if="!openCells.length" class="qbk__note">{{ t('No free times this month.') }} <button type="button" class="qbk__link" @click="shiftMonth(1)">{{ t('Next month') }}</button></p>
          <p v-if="zoneNote" class="qbk__note">{{ zoneNote }}</p>
        </div>

        <div class="qbk__card">
          <b class="qbk__dayname">{{ dateLabel }}</b>
          <template v-if="date && daySlots.length">
            <template v-for="g in groups" :key="g.key">
              <div v-if="g.slots.length" class="qbk__part">{{ g.label }}</div>
              <div v-if="g.slots.length" class="qbk__times">
                <button v-for="s in g.slots" :key="s.start" type="button" class="qbk__time" :class="{ on: slot?.start === s.start }" :aria-pressed="slot?.start === s.start" @click="slot = s">
                  {{ s.time }}<small v-if="s.left != null">{{ tn('{n} place left', '{n} places left', s.left) }}</small>
                </button>
              </div>
            </template>
          </template>
          <p v-else-if="date" class="qbk__note">{{ t('No free times on this day.') }}</p>
          <div v-if="slot && svc.capacity > 1 && svc.max_seats > 1" class="qbk__seats">
            <label :for="fid('seats')">{{ t('Places') }}</label>
            <select :id="fid('seats')" v-model.number="seats" class="qbk__select">
              <option v-for="n in Math.min(svc.max_seats, slot.left || 1)" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
          <p v-if="problem" class="qbk__problem" role="alert">{{ problem }}</p>
          <button type="button" class="qbk__cta" :disabled="!slot || busy" @click="takeTime">{{ busy ? t('One moment…') : t('Continue') }}</button>
        </div>
      </div>

      <!-- 3. The form -->
      <form v-else-if="step === 'details'" class="qbk__card qbk__form" @submit.prevent="submit">
        <div class="qbk__hold">
          <span>{{ t('We\'re keeping {when} for you', { when: chosenText }) }}</span>
          <b class="qbk__clock">{{ clock }}</b>
          <button type="button" class="qbk__link" @click="backToTimes">{{ t('Change') }}</button>
        </div>
        <q-input v-model="form.name" :for="fid('name')" :label="t('Full name')" outlined dense autocomplete="name" maxlength="190" />
        <q-input v-model="form.email" :for="fid('email')" :label="t('Email')" type="email" outlined dense autocomplete="email" maxlength="190" />
        <q-input v-model="form.phone" :for="fid('phone')" :label="t('Phone')" type="tel" outlined dense autocomplete="tel" maxlength="40" class="qbk__ltr" />
        <q-input v-if="svc.place.type === 'customer'" v-model="form.address" :for="fid('address')" :label="t('Address')" outlined dense autocomplete="street-address" maxlength="255" />
        <template v-for="q in svc.questions" :key="q.id">
          <q-input v-if="q.type === 'text'" v-model="form.answers[q.id]" :for="fid(q.id)" :label="q.label + (q.required ? ' *' : '')" outlined dense maxlength="300" />
          <q-input v-else-if="q.type === 'textarea'" v-model="form.answers[q.id]" :for="fid(q.id)" :label="q.label + (q.required ? ' *' : '')" type="textarea" autogrow outlined dense maxlength="2000" />
          <div v-else-if="q.type === 'choice'" class="qbk__q">
            <label :for="fid(q.id)">{{ q.label }}{{ q.required ? ' *' : '' }}</label>
            <select :id="fid(q.id)" v-model="form.answers[q.id]" class="qbk__select">
              <option value="">{{ t('Choose') }}</option>
              <option v-for="o in q.options" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <label v-else class="qbk__check"><input :id="fid(q.id)" v-model="form.answers[q.id]" type="checkbox"> <span>{{ q.label }}</span></label>
        </template>
        <!-- People never see this field; bots fill it in. -->
        <input v-model="form.website" class="qbk__hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="qbk__total">
          <span>{{ svc.name }} · {{ chosenText }}</span>
          <b v-if="paid">{{ t('To pay now: {amount}', { amount: money(svc.due_now * seats) }) }}</b>
          <b v-else-if="svc.price && d.show_prices !== false">{{ money(svc.price * seats) }}<small v-if="svc.pay === 'there'"> · {{ t('paid there') }}</small></b>
        </div>
        <p v-if="info.terms" class="qbk__note">{{ info.terms }}</p>
        <p v-if="problem" class="qbk__problem" role="alert">{{ problem }}</p>
        <button type="submit" class="qbk__cta" :disabled="busy">{{ busy ? t('One moment…') : paid ? t('Continue to payment') : (d.button_text || t('Book')) }}</button>
      </form>

      <!-- 4. Done -->
      <div v-else-if="step === 'done'" class="qbk__card qbk__done" role="status">
        <div class="qbk__tick" aria-hidden="true">✓</div>
        <b class="qbk__done-h" :class="titleText.class">{{ t('You\'re booked!') }}</b>
        <p>{{ svc.name }} · {{ chosenText }}</p>
        <p v-if="doneText" class="qbk__desc" :class="bodyText.class" :style="bodyText.style">{{ doneText }}</p>
        <p class="qbk__note">{{ t('We emailed the details to {email}.', { email: form.email }) }}</p>
        <div class="qbk__adds">
          <span>{{ t('Add to your calendar:') }}</span>
          <a v-if="done?.google" :href="done.google" target="_blank" rel="noopener">Google</a>
          <a v-if="done?.outlook" :href="done.outlook" target="_blank" rel="noopener">Outlook</a>
          <a v-if="done?.ics" :href="done.ics">{{ t('Apple / other') }}</a>
        </div>
        <router-link v-if="manageLink" class="qbk__link" :to="manageLink">{{ t('Move or cancel') }}</router-link>
        <button type="button" class="qbk__link" @click="again">{{ t('Book another time') }}</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n, currentLocale } from 'src/i18n/index.js'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { textStyle, tsKeys } from 'src/utils/text-style.js'
import { useFieldIds } from 'src/utils/field-id.js'
import { fetchProductById } from 'src/api/woocommerce.js'
import { bookingApi, failText, moneyText, shopperZone } from 'src/composables/useBooking.js'
import cart from 'src/stores/cart.js'

/**
 * "Booking" (Store builder; Appointments): a service (or a list to choose from),
 * a month with the days that have free times, the times, then the form. Free and
 * pay-there services are booked here; paid ones go through the checkout (the time
 * is held while they pay). Everything after the frame loads in the browser, from
 * the block's own mounted flag (never the page's).
 */
const props = defineProps({ data: { type: Object, default: () => ({}) }, blockId: { type: String, default: '' } })
const { t, tn } = useI18n()
const fid = useFieldIds()
const router = useRouter()
const d = computed(() => props.data?.data || {})
const title = computed(() => String(d.value.title ?? '').trim())
const pick = (v) => (v && typeof v === 'object' ? (v.desktop || 'side') : (v || 'side'))
const layout = computed(() => (pick(d.value.layout) === 'stack' ? 'stack' : 'side'))
const titleText = computed(() => textStyle(d.value, tsKeys('title')))
const bodyText = computed(() => textStyle(d.value, tsKeys('text')))
const vars = computed(() => {
  const v = {}
  const accent = resolveGlobalColor(d.value.accent || 'global:secondary')
  if (accent) v['--qbk-accent'] = accent
  const bg = resolveGlobalColor(d.value.card_bg)
  if (bg) v['--qbk-card'] = bg
  const line = resolveGlobalColor(d.value.border_color)
  if (line) v['--qbk-line'] = line
  return v
})

const mounted = ref(false)
const loading = ref(true)
const info = ref(null)
const problem = ref('')
const busy = ref(false)
const fixedService = computed(() => Number(d.value.service_id) || 0)
const list = computed(() => {
  const all = info.value?.services || []
  if (fixedService.value) return all.filter((s) => s.id === fixedService.value)
  const group = String(d.value.category || '').trim().toLowerCase()
  return all.filter((s) => !s.hidden && (!group || s.category.toLowerCase() === group))
})
const svc = ref(null)
const step = ref('service')
const paid = computed(() => !!svc.value && ['full', 'deposit'].includes(svc.value.pay) && svc.value.product_id > 0)
const stepNames = computed(() => {
  const s = []
  if (!fixedService.value) s.push({ key: 'service', label: t('Service') })
  s.push({ key: 'time', label: t('Day and time') }, { key: 'details', label: t('Your details') })
  if (paid.value) s.push({ key: 'pay', label: t('Payment') })
  return s
})
const stepIndex = computed(() => Math.max(0, stepNames.value.findIndex((s) => s.key === step.value)) + (step.value === 'done' ? 99 : 0))

const money = (n) => moneyText(n, info.value?.currency, currentLocale())
const lengthText = (m) => (m < 60 ? t('{n} min', { n: m }) : m % 60 ? t('{h} h {m} min', { h: Math.floor(m / 60), m: m % 60 }) : tn('{n} hour', '{n} hours', m / 60))
function facts(s) {
  const parts = []
  if (d.value.show_length !== false) parts.push(lengthText(s.duration))
  if (d.value.show_prices !== false) {
    if (s.price) parts.push(money(s.price))
    else parts.push(t('Free'))
    if (s.pay === 'deposit') parts.push(t('{amount} deposit', { amount: money(s.due_now) }))
  }
  if (s.place?.text) parts.push(s.place.text)
  return parts.join(' · ')
}

onMounted(async () => {
  mounted.value = true
  const res = await bookingApi.services(fixedService.value)
  info.value = res.ok ? res.data : null
  if (!res.ok) problem.value = failText(res, '')
  loading.value = false
  if (list.value.length === 1) chooseService(list.value[0])
})

/* ---------------- days and times ---------------- */
const pad = (n) => String(n).padStart(2, '0')
const month = ref('') // 'Y-m'
const days = ref({})
const loadingTimes = ref(false)
const date = ref('')
const slot = ref(null)
const seats = ref(1)
const todayYmd = computed(() => info.value?.today || '')
const canBack = computed(() => month.value > todayYmd.value.slice(0, 7))
function chooseService(s) {
  svc.value = s
  step.value = 'time'
  month.value = todayYmd.value.slice(0, 7)
  date.value = ''
  slot.value = null
  loadMonth()
}
function backToServices() { svc.value = null; step.value = 'service' }
function shiftMonth(n) {
  const [y, m] = month.value.split('-').map(Number)
  const at = new Date(y, m - 1 + n, 1)
  month.value = `${at.getFullYear()}-${pad(at.getMonth() + 1)}`
  date.value = ''
  slot.value = null
  loadMonth()
}
let asked = 0
async function loadMonth() {
  const [y, m] = month.value.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  const from = `${month.value}-01` < todayYmd.value ? todayYmd.value : `${month.value}-01`
  const ask = ++asked
  loadingTimes.value = true
  const res = await bookingApi.times(svc.value.id, from, `${month.value}-${pad(last)}`, seats.value)
  if (ask !== asked) return
  days.value = res.ok ? (res.data?.days || {}) : {}
  if (!res.ok) problem.value = failText(res, t('We couldn\'t load the free times. Please try again.'))
  loadingTimes.value = false
  if (!date.value) date.value = Object.keys(days.value).find((k) => days.value[k]?.length) || ''
}
const weekStart = computed(() => Number(info.value?.week_start || 0))
const weekdays = computed(() => Array.from({ length: 7 }, (_, i) => new Date(2026, 10, 15 + ((i + weekStart.value) % 7)).toLocaleDateString(currentLocale(), { weekday: 'narrow' })))
const firstDow = computed(() => { const [y, m] = month.value.split('-').map(Number); return new Date(y, m - 1, 1).getDay() })
const lead = computed(() => (firstDow.value - weekStart.value + 7) % 7)
const cells = computed(() => {
  if (!month.value) return []
  const [y, m] = month.value.split('-').map(Number)
  const n = new Date(y, m, 0).getDate()
  return Array.from({ length: n }, (_, i) => {
    const ymd = `${month.value}-${pad(i + 1)}`
    const at = new Date(y, m - 1, i + 1, 12)
    return { ymd, n: i + 1, open: !!days.value[ymd]?.length, wd: at.toLocaleDateString(currentLocale(), { weekday: 'short' }), label: at.toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' }) }
  })
})
const openCells = computed(() => cells.value.filter((c) => c.open))
const monthLabel = computed(() => { if (!month.value) return ''; const [y, m] = month.value.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString(currentLocale(), { month: 'long', year: 'numeric' }) })
const dateLabel = computed(() => (date.value ? new Date(`${date.value}T12:00:00`).toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' }) : t('Choose a day')))
const daySlots = computed(() => days.value[date.value] || [])
const groups = computed(() => {
  const hour = (s) => Number(s.time.slice(0, 2))
  return [
    { key: 'm', label: t('Morning'), slots: daySlots.value.filter((s) => hour(s) < 12) },
    { key: 'a', label: t('Afternoon'), slots: daySlots.value.filter((s) => hour(s) >= 12 && hour(s) < 17) },
    { key: 'e', label: t('Evening'), slots: daySlots.value.filter((s) => hour(s) >= 17) },
  ]
})
watch(date, () => { slot.value = null; problem.value = '' })
const zone = ref('')
onMounted(() => { zone.value = shopperZone() })
const zoneNote = computed(() => {
  const store = info.value?.tz || ''
  // A store with only an offset ("+00:00", no time zone set) gets no note.
  if (!store.includes('/') || !zone.value || zone.value === store) return ''
  const city = store.split('/').pop().replace(/_/g, ' ')
  return t('Times are in {zone} time.', { zone: city })
})
const yourTime = (iso) => new Date(iso).toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit' })
const chosenText = computed(() => {
  if (!slot.value) return ''
  const day = new Date(`${date.value}T12:00:00`).toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric', month: 'short' })
  return zoneNote.value ? `${day}, ${slot.value.time} (${t('{time} your time', { time: yourTime(slot.value.start) })})` : `${day}, ${slot.value.time}`
})

/* ---------------- holding the time ---------------- */
const hold = ref(null)
const now = ref(Date.now())
let ticker = 0
const clock = computed(() => {
  if (!hold.value) return ''
  const left = Math.max(0, Math.floor((new Date(hold.value.until).getTime() - now.value) / 1000))
  return `${Math.floor(left / 60)}:${pad(left % 60)}`
})
watch(clock, (c) => {
  if (c === '0:00' && step.value === 'details') {
    hold.value = null
    step.value = 'time'
    problem.value = t('We couldn\'t keep that time any longer. Please pick it again.')
    loadMonth()
  }
})
async function takeTime() {
  if (!slot.value) return
  busy.value = true
  problem.value = ''
  const res = await bookingApi.hold(svc.value.id, slot.value.start, seats.value)
  busy.value = false
  if (!res.ok) {
    problem.value = failText(res, t('That time was just taken. Please pick another one.'))
    loadMonth()
    return
  }
  hold.value = res.data
  now.value = Date.now()
  clearInterval(ticker)
  ticker = setInterval(() => { now.value = Date.now() }, 1000)
  step.value = 'details'
}
function backToTimes() {
  if (hold.value) bookingApi.release(hold.value.hold)
  hold.value = null
  step.value = 'time'
  loadMonth()
}
onBeforeUnmount(() => {
  clearInterval(ticker)
  // Leaving before booking a free service: the time goes back at once (a paid one stays held for the checkout).
  if (hold.value && step.value === 'details') bookingApi.release(hold.value.hold)
})

/* ---------------- the form ---------------- */
const form = reactive({ name: '', email: '', phone: '', address: '', answers: {}, website: '' })
const done = ref(null)
const doneText = computed(() => String(d.value.done_text || info.value?.confirm_text || '').trim())
const manageLink = computed(() => (done.value?.id && done.value?.key ? `/booking/${done.value.id}?k=${done.value.key}` : ''))
async function submit() {
  busy.value = true
  problem.value = ''
  let lang = ''
  try { lang = document.documentElement.lang || '' } catch { /* no document */ }
  const payload = { name: form.name, email: form.email, phone: form.phone, address: form.address, answers: form.answers, website: form.website, lang, tz: zone.value }
  if (!paid.value) {
    const res = await bookingApi.book(hold.value.hold, payload)
    busy.value = false
    if (!res.ok) { problem.value = failText(res, t('Something went wrong. Please try again.')); if (res.status === 410 || res.status === 409) backToTimes(); return }
    done.value = res.data
    hold.value = null
    clearInterval(ticker)
    step.value = 'done'
    return
  }
  const saved = await bookingApi.details(hold.value.hold, payload)
  if (!saved.ok) { busy.value = false; problem.value = failText(saved, t('Something went wrong. Please try again.')); if (saved.status === 410) backToTimes(); return }
  try {
    const product = await fetchProductById(svc.value.product_id)
    await cart.addBooking(product, { key: hold.value.hold, hold: hold.value.hold, when: chosenText.value }, svc.value.due_now * seats.value)
    hold.value = null
    clearInterval(ticker)
    router.push('/checkout')
  } catch {
    problem.value = t('Something went wrong. Please try again.')
  }
  busy.value = false
}
function again() {
  done.value = null
  slot.value = null
  Object.assign(form, { answers: {} })
  if (fixedService.value || list.value.length === 1) { step.value = 'time'; loadMonth() } else backToServices()
}
</script>

<style scoped>
.qbk { display: grid; gap: 16px; --qbk-accent: var(--q-secondary); --qbk-card: transparent; --qbk-line: rgba(127, 127, 127, .28); }
.qbk__title { font-size: 1.6em; font-weight: 600; }
.qbk__card { background: var(--qbk-card); border: 1px solid var(--qbk-line); border-radius: 14px; padding: 16px; min-width: 0; }
.qbk__loading { display: grid; gap: 10px; }
.qbk__loading span { height: 14px; border-radius: 7px; background: var(--qbk-line); opacity: .5; }
.qbk__loading span:nth-child(2) { width: 70%; }
.qbk__loading span:nth-child(3) { width: 40%; }
.qbk__closed { text-align: center; opacity: .8; }
.qbk__steps { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; margin: 0; padding: 0; font-size: .85em; }
.qbk__steps li { border: 1px solid var(--qbk-line); border-radius: 99px; padding: 3px 12px; opacity: .65; }
.qbk__steps li.done { opacity: 1; }
.qbk__steps li.on { background: var(--qbk-accent); border-color: var(--qbk-accent); color: #fff; opacity: 1; }
.qbk__services { display: grid; gap: 10px; }
.qbk__svc { display: flex; align-items: center; gap: 14px; width: 100%; text-align: start; cursor: pointer; font: inherit; color: inherit; }
.qbk__svc:hover { border-color: var(--qbk-accent); }
.qbk__svc-text { flex: 1; display: grid; gap: 3px; min-width: 0; }
.qbk__svc-text small, .qbk__sum small { opacity: .7; }
.qbk__desc { white-space: pre-line; opacity: .85; }
.qbk__go { font-size: 1.4em; opacity: .5; }
[dir="rtl"] .qbk__flip { display: inline-block; transform: scaleX(-1); }
.qbk__pic { width: 56px; height: 56px; border-radius: 12px; background: var(--qbk-line) center / cover no-repeat; flex: none; }
.qbk__grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 16px; align-items: start; }
.qbk--stack .qbk__grid { grid-template-columns: minmax(0, 1fr); }
.qbk__sum { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.qbk__sum > div { flex: 1; display: grid; min-width: 0; }
.qbk__link { background: none; border: 0; padding: 0; color: var(--qbk-accent); text-decoration: underline; cursor: pointer; font: inherit; }
.qbk__mon-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.qbk__arrow { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--qbk-line); background: transparent; color: inherit; cursor: pointer; font-size: 1.1em; }
.qbk__arrow:disabled { opacity: .3; cursor: default; }
.qbk__days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; text-align: center; }
.qbk__wd { font-size: .75em; opacity: .6; padding: 4px 0; }
.qbk__day { aspect-ratio: 1; max-width: 100%; border: 0; border-radius: 10px; background: transparent; color: inherit; font: inherit; font-variant-numeric: tabular-nums; opacity: .35; }
.qbk__day.open { opacity: 1; font-weight: 600; background: color-mix(in srgb, var(--qbk-accent) 12%, transparent); cursor: pointer; }
.qbk__day.on { background: var(--qbk-accent); color: #fff; }
.qbk__strip { display: none; gap: 6px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
.qbk__sday { flex: none; width: 54px; border: 1px solid var(--qbk-line); background: transparent; color: inherit; border-radius: 12px; padding: 6px 0; display: grid; font: inherit; cursor: pointer; }
.qbk__sday b { font-size: 1.15em; font-variant-numeric: tabular-nums; }
.qbk__sday small { font-size: .7em; opacity: .7; }
.qbk__sday.on { background: var(--qbk-accent); border-color: var(--qbk-accent); color: #fff; }
.qbk__note { font-size: .85em; opacity: .75; margin: 10px 0 0; }
.qbk__dayname { display: block; margin-bottom: 4px; font-size: 1.05em; }
.qbk__part { font-size: .72em; letter-spacing: .06em; text-transform: uppercase; opacity: .6; margin: 12px 0 6px; font-weight: 600; }
.qbk__times { display: grid; grid-template-columns: repeat(auto-fill, minmax(78px, 1fr)); gap: 6px; }
.qbk__time { border: 1px solid var(--qbk-line); background: transparent; color: inherit; border-radius: 10px; padding: 8px 4px; font: inherit; font-variant-numeric: tabular-nums; cursor: pointer; display: grid; }
.qbk__time small { font-size: .68em; opacity: .7; }
.qbk__time.on { background: var(--qbk-accent); border-color: var(--qbk-accent); color: #fff; }
.qbk__time.on small { opacity: 1; }
.qbk__seats { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.qbk__select { border: 1px solid var(--qbk-line); border-radius: 8px; padding: 6px 10px; background: transparent; color: inherit; font: inherit; }
.qbk__cta { margin-top: 14px; width: 100%; border: 0; border-radius: 12px; padding: 12px 18px; background: var(--qbk-accent); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
.qbk__cta:disabled { opacity: .5; cursor: default; }
.qbk__problem { color: var(--q-negative, #c10015); margin: 10px 0 0; font-size: .9em; }
.qbk__form { display: grid; gap: 12px; max-width: 560px; }
.qbk__hold { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; border-radius: 10px; padding: 10px 12px; background: color-mix(in srgb, var(--qbk-accent) 10%, transparent); font-size: .9em; }
.qbk__hold > span { flex: 1; min-width: 160px; }
.qbk__clock { font-variant-numeric: tabular-nums; }
.qbk__ltr :deep(input) { direction: ltr; text-align: start; unicode-bidi: plaintext; }
.qbk__q { display: grid; gap: 4px; }
.qbk__check { display: flex; gap: 8px; align-items: center; }
.qbk__hp { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; inset-inline-start: -9999px; }
.qbk__total { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 12px; border-top: 1px solid var(--qbk-line); padding-top: 12px; }
.qbk__done { text-align: center; display: grid; gap: 8px; justify-items: center; max-width: 560px; }
.qbk__done p { margin: 0; }
.qbk__tick { width: 52px; height: 52px; border-radius: 50%; background: var(--qbk-accent); color: #fff; display: grid; place-items: center; font-size: 1.6em; }
.qbk__done-h { font-size: 1.3em; }
.qbk__adds { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: center; font-size: .9em; }
.qbk__adds a { border: 1px solid var(--qbk-line); border-radius: 8px; padding: 6px 12px; color: inherit; text-decoration: none; font-weight: 600; }
@media (max-width: 700px) {
  .qbk__grid { grid-template-columns: minmax(0, 1fr); }
  .qbk__mon { display: none; }
  .qbk__strip { display: flex; }
}
</style>
