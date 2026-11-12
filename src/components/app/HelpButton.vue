<template>
  <template v-if="cfg">
    <!-- The button: zero-wide anchor on the chosen edge, the button centred on it (no left/right, so it flips with the language). -->
    <div v-show="!help.open" class="help-fab-at" :class="[EDGE[cfg.edge], STYLE[cfg.style], { 'help-fab-at--lift': lifted }]" :style="fabStyle">
      <button type="button" class="help-fab" :aria-label="label" @click="openHelp()">
        <span v-if="cfg.style === 'round'" aria-hidden="true">?</span>
        <span v-else><template v-if="cfg.style === 'pill'">? </template>{{ label }}</span>
      </button>
    </div>

    <div v-if="help.open" class="help-backdrop" @click="closeHelp()" />
    <div v-if="help.open" ref="panelEl" class="help-panel" role="dialog" aria-modal="false" :aria-label="title" tabindex="-1" :style="panelStyle" data-clarity-mask="True" @keydown.esc="closeHelp()">
      <div class="help-panel__head">
        <button v-if="help.view !== 'home'" type="button" class="help-link" @click="back">‹ {{ t('Back') }}</button>
        <div v-else>
          <h2>{{ title }}</h2>
          <small v-if="cfg.answer_time">{{ cfg.answer_time }}</small>
        </div>
        <button type="button" class="help-close" :aria-label="t('Close')" @click="closeHelp()">✕</button>
      </div>

      <div class="help-panel__body">
        <!-- Home: answers first, then the order lookup and a message. -->
        <template v-if="help.view === 'home'">
          <template v-if="cfg.answers && cfg.faq.length">
            <input v-if="cfg.faq.length > 4" v-model="search" class="help-input" type="search" :placeholder="t('Search answers')" :aria-label="t('Search answers')">
            <details v-for="(a, i) in answers" :key="i" class="help-answer">
              <summary>{{ a.q }}</summary>
              <p>{{ a.a }}</p>
            </details>
            <p v-if="search && !answers.length" class="help-muted">{{ t('No answer matches. Write to us and we\'ll help.') }}</p>
          </template>
          <div class="help-tiles">
            <button v-if="cfg.order" type="button" class="help-tile" @click="go('order')"><b>{{ t('Where is my order?') }}</b><span>{{ t('Status of your order') }}</span></button>
            <button v-if="cfg.write" type="button" class="help-tile" @click="startWrite()"><b>{{ t('Write to us') }}</b><span>{{ t('We answer here and by email') }}</span></button>
          </div>
          <button v-if="hasMessages" type="button" class="help-row" @click="go('list')">{{ t('Your messages') }} ›</button>
        </template>

        <!-- Where is my order? -->
        <template v-else-if="help.view === 'order'">
          <h3>{{ t('Where is my order?') }}</h3>
          <ul v-if="mine?.orders?.length && !found" class="help-orders">
            <li v-for="o in mine.orders" :key="o.number"><button type="button" class="help-row" @click="found = o">{{ t('Order #{n}', { n: o.number }) }} · {{ o.date }}<span>{{ o.label }} ›</span></button></li>
          </ul>
          <form v-if="!found" class="help-form" @submit.prevent="lookup">
            <div class="help-two">
              <label class="help-field"><span>{{ t('Order number') }}</span><input v-model="orderNo" inputmode="numeric" maxlength="12" required></label>
              <label class="help-field"><span>{{ t('Email') }}</span><input v-model="orderMail" type="email" maxlength="190" autocomplete="email" required></label>
            </div>
            <p v-if="orderError" class="help-error" role="alert">{{ orderError }}</p>
            <button type="submit" class="help-btn help-btn--main" :disabled="busy">{{ busy ? t('Checking…') : t('Check') }}</button>
          </form>
          <template v-else>
            <p class="help-order-title"><b>{{ t('Order #{n}', { n: found.number }) }}</b> · {{ found.date }}</p>
            <p v-if="found.stopped" class="help-error">{{ found.label }}</p>
            <ol v-else class="help-steps">
              <li class="is-on">{{ t('Order received') }}</li>
              <li :class="{ 'is-on': found.paid }">{{ t('Paid') }}</li>
              <li :class="{ 'is-on': found.done }">{{ found.done ? t('Completed') : found.label }}</li>
            </ol>
            <p v-if="found.delivery" class="help-muted">{{ t('Delivery: {method}', { method: found.delivery }) }}</p>
            <button v-if="cfg.write" type="button" class="help-btn" @click="startWrite(found.number)">{{ t('Write to us about this order') }}</button>
            <button type="button" class="help-link" @click="found = null">{{ t('Check another order') }}</button>
          </template>
        </template>

        <!-- Write to us -->
        <form v-else-if="help.view === 'write'" class="help-form" @submit.prevent="send">
          <h3>{{ t('Write to us') }}</h3>
          <label class="help-field"><span>{{ t('Topic') }}</span>
            <select v-model="topic"><option v-for="x in topics" :key="x" :value="x">{{ x }}</option></select>
          </label>
          <label v-if="help.order || topic === orderTopic" class="help-field"><span>{{ t('Order number') }}</span><input v-model="help.order" inputmode="numeric" maxlength="12"></label>
          <label class="help-field"><span>{{ t('Your message') }}</span><textarea v-model="message" rows="4" maxlength="4000" required /></label>
          <p v-if="onProduct && !help.order" class="help-attach">{{ t('Attached: the product on this page') }}</p>
          <template v-if="!signedInNow">
            <label class="help-field"><span>{{ t('Your name') }}</span><input v-model="name" maxlength="120" autocomplete="name"></label>
            <label class="help-field"><span>{{ t('Email') }}</span><input v-model="email" type="email" maxlength="190" autocomplete="email" required></label>
          </template>
          <input v-model="website" class="help-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <p v-if="writeError" class="help-error" role="alert">{{ writeError }}</p>
          <button type="submit" class="help-btn help-btn--main" :disabled="busy || !message.trim()">{{ busy ? t('Sending…') : t('Send') }}</button>
        </form>

        <!-- One conversation -->
        <HelpThread v-else-if="help.view === 'thread' && help.thread" :thread-key="help.thread" :note="sentNote" />

        <!-- The shopper's conversations -->
        <template v-else-if="help.view === 'list'">
          <h3>{{ t('Your messages') }}</h3>
          <p v-if="!threads.length" class="help-muted">{{ t('No messages yet.') }}</p>
          <button v-for="c in threads" :key="c.k" type="button" class="help-row help-row--conv" @click="openThread(c.k)">
            <b>{{ c.topic || t('Message') }}<i v-if="c.answered" class="help-new">{{ t('Answered') }}</i></b>
            <span>{{ c.preview }}</span>
          </button>
        </template>
      </div>
    </div>
  </template>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import HelpThread from 'src/components/help/HelpThread.vue'
import { closeHelp, help, helpConfig, keptThreads, loadMine, lookupOrder, openHelp, writeToStore } from 'src/composables/useHelp.js'
import { useAccount } from 'src/composables/useAccount.js'
import { useI18n } from 'src/i18n/index.js'

/**
 * The storefront's Help button and its panel (the owner sets it up in the
 * dashboard: Customers → Inbox → Settings). Answers first, then "Where is my
 * order?" without a human, then a message. Messages, not live chat: the answer
 * comes here and by email. Drawn in the browser only (MainLayout, after
 * hydration); nothing here is in the server's page.
 */
const { t } = useI18n()
const route = useRoute()
const { user } = useAccount()

// Class names in full, so the build keeps their styles.
const EDGE = { start: 'help-fab-at--start', end: 'help-fab-at--end', bottom: 'help-fab-at--bottom' }
const STYLE = { pill: 'help-fab-at--pill', round: 'help-fab-at--round', tab: 'help-fab-at--tab' }

const cfg = ref(null)
const panelEl = ref(null)
const lifted = ref(false)
const signedInNow = computed(() => !!user.value?.id && !user.value?.sample)
const label = computed(() => cfg.value?.label || t('Help'))
const title = computed(() => cfg.value?.title || t('How can we help?'))
const colours = computed(() => ({
  ...(cfg.value?.bg ? { '--help-accent': cfg.value.bg } : {}),
  ...(cfg.value?.color ? { '--help-accent-text': cfg.value.color } : {}),
}))
const fabStyle = computed(() => ({ '--help-pos': `${cfg.value.edge === 'end' ? Math.min(cfg.value.position, 76) : cfg.value.position}%`, ...colours.value }))
const panelStyle = computed(() => colours.value)

/* ---------------- answers ---------------- */
const search = ref('')
const answers = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = cfg.value?.faq || []
  return q ? list.filter((a) => `${a.q} ${a.a}`.toLowerCase().includes(q)) : list.slice(0, 6)
})

/* ---------------- the shopper's own conversations and orders ---------------- */
const mine = ref(null)
const guestKeys = ref([])
const threads = computed(() => (signedInNow.value ? mine.value?.conversations || [] : guestKeys.value.map((k) => ({ k, topic: '', preview: '', answered: false }))))
const hasMessages = computed(() => threads.value.length > 0)
async function refreshMine() {
  guestKeys.value = keptThreads()
  if (signedInNow.value) mine.value = await loadMine()
}

/* ---------------- moving around ---------------- */
function go(view) {
  help.view = view
}
function back() {
  if (help.view === 'thread' && hasMessages.value && threads.value.length > 1) help.view = 'list'
  else if (help.view === 'write' && help.order && found.value) help.view = 'order'
  else help.view = 'home'
  sentNote.value = ''
}
function openThread(k) {
  sentNote.value = ''
  help.thread = k
  help.view = 'thread'
}

/* ---------------- where is my order? ---------------- */
const orderNo = ref('')
const orderMail = ref('')
const orderError = ref('')
const found = ref(null)
const busy = ref(false)
async function lookup() {
  if (busy.value) return
  busy.value = true
  orderError.value = ''
  const res = await lookupOrder(orderNo.value, orderMail.value)
  busy.value = false
  if (res.error !== undefined) orderError.value = res.error || t('Could not check right now. Please try again.')
  else if (!res.found) orderError.value = t('We couldn\'t find an order with this number and email. Check both and try again.')
  else found.value = res.order
}

/* ---------------- write to us ---------------- */
const topics = computed(() => (cfg.value?.topics?.length ? cfg.value.topics : [t('Before buying'), t('An order'), t('Returns')]))
// The topic "An order" (the second ready-made one) asks for the order number.
const orderTopic = computed(() => (cfg.value?.topics?.length ? '' : t('An order')))
const topic = ref('')
const message = ref('')
const name = ref('')
const email = ref('')
const website = ref('')
const writeError = ref('')
const sentNote = ref('')
const onProduct = computed(() => /\/product\/[^/]+/.test(route.path))
function startWrite(order = '') {
  if (order) {
    help.order = String(order)
    // The email typed for the lookup comes along.
    if (!signedInNow.value && orderMail.value && !email.value) email.value = orderMail.value
    help.orderEmail = orderMail.value
  }
  topic.value = help.order && orderTopic.value ? orderTopic.value : topics.value[0]
  writeError.value = ''
  help.view = 'write'
}
async function send() {
  if (busy.value || !message.value.trim()) return
  busy.value = true
  writeError.value = ''
  const res = await writeToStore({
    topic: topic.value,
    message: message.value.trim(),
    name: name.value.trim(),
    email: email.value.trim(),
    page: route.path,
    order: help.order,
    order_email: help.orderEmail,
    website: website.value,
  })
  busy.value = false
  if (res.error !== undefined) {
    writeError.value = res.error || t('Could not send. Please check your connection and try again.')
    return
  }
  message.value = ''
  help.order = ''
  await refreshMine()
  if (res.k) {
    sentNote.value = t('We got it. We\'ll answer here and by email.')
    help.thread = res.k
    help.view = 'thread'
  } else {
    help.view = 'home'
  }
}

/* ---------------- opening ---------------- */
watch(() => help.open, (open) => {
  if (!open) return
  found.value = null
  orderError.value = ''
  refreshMine()
  if (help.view === 'write') startWrite(help.order)
  nextTick(() => panelEl.value?.focus({ preventScroll: true }))
})

/** On the cart's corner, Help sits above the store's other floating buttons. */
function checkLift() {
  lifted.value = cfg.value?.edge === 'bottom' && cfg.value.position > 62 && !!document.querySelector('.qwoo-contact-btn-wrap, .floating-cart, .widget-floating')
}
// Links and buttons with the address "#help" open the panel.
function onClick(e) {
  const a = e.target?.closest?.('a[href$="#help"]')
  if (!a || !cfg.value) return
  e.preventDefault()
  openHelp()
}
const onOpenEvent = (e) => openHelp(e.detail || {})

onMounted(() => {
  cfg.value = helpConfig()
  if (!cfg.value) return
  setTimeout(checkLift, 1200)
  document.addEventListener('click', onClick, true)
  window.addEventListener('qwoo:help', onOpenEvent)
})
watch(() => route.path, () => setTimeout(checkLift, 600))
onBeforeUnmount(() => {
  document.removeEventListener('click', onClick, true)
  window.removeEventListener('qwoo:help', onOpenEvent)
})
</script>

<style>
/* The Help button and panel. Not scoped: HelpThread and My account → Messages share the form styles. */
.help-fab-at { position: fixed; z-index: 998; display: flex; --help-off: 14px; }
.help-fab-at--tab { --help-off: 0px; }
.help-fab-at--start, .help-fab-at--end { top: var(--help-pos, 50%); height: 0; align-items: center; }
.help-fab-at--start { inset-inline-start: var(--help-off); }
.help-fab-at--end { inset-inline-end: var(--help-off); }
.help-fab-at--bottom { bottom: var(--help-off); inset-inline-start: var(--help-pos, 50%); width: 0; justify-content: center; align-items: flex-end; }
.help-fab-at--bottom.help-fab-at--lift { bottom: 78px; }
.help-fab { flex: none; border: 0; cursor: pointer; white-space: nowrap; font: inherit; font-weight: 600; font-size: 15px; line-height: 1.2; padding: 10px 16px; border-radius: 999px; background: var(--help-accent, #1d1b2e); color: var(--help-accent-text, #fff); box-shadow: 0 4px 14px rgba(0, 0, 0, .18); }
.help-fab:focus-visible { outline: 2px solid var(--help-accent, #1d1b2e); outline-offset: 3px; }
.help-fab-at--round .help-fab { width: 46px; height: 46px; padding: 0; font-size: 19px; }
.help-fab-at--tab .help-fab { border-radius: 10px 10px 0 0; padding: 8px 14px; box-shadow: none; }
.help-fab-at--tab.help-fab-at--start .help-fab, .help-fab-at--tab.help-fab-at--end .help-fab { padding: 14px 8px; }
.help-fab-at--tab.help-fab-at--start .help-fab span, .help-fab-at--tab.help-fab-at--end .help-fab span { writing-mode: vertical-rl; display: block; }
.help-fab-at--tab.help-fab-at--start .help-fab { border-radius: 0; border-start-end-radius: 10px; border-end-end-radius: 10px; }
.help-fab-at--tab.help-fab-at--end .help-fab { border-radius: 0; border-start-start-radius: 10px; border-end-start-radius: 10px; }

.help-backdrop { position: fixed; inset: 0; z-index: 2999; background: rgba(0, 0, 0, .25); }
.help-panel { position: fixed; z-index: 3000; inset-inline: 0; bottom: 0; max-height: 86vh; display: flex; flex-direction: column; background: #fff; color: #1d1b2e; border-radius: 20px 20px 0 0; box-shadow: 0 -8px 40px rgba(0, 0, 0, .2); font-size: 15px; line-height: 1.45; outline: none; --help-muted: #6b6880; --help-line: #e3e1ef; }
@media (min-width: 600px) {
  .help-backdrop { display: none; }
  .help-panel { inset-inline: auto 18px; bottom: 18px; width: 384px; max-height: min(640px, 86vh); border-radius: 18px; box-shadow: 0 12px 44px rgba(0, 0, 0, .22); }
}
@media (prefers-reduced-motion: no-preference) {
  .help-panel { animation: help-rise .22s ease-out; }
  @keyframes help-rise { from { transform: translateY(14px); opacity: .5; } }
}
.help-panel__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 16px 16px 8px; }
.help-panel__head h2 { margin: 0; font-size: 18px; line-height: 1.3; font-weight: 700; }
.help-panel__head small { color: var(--help-muted); font-size: 13px; }
.help-close { border: 1px solid var(--help-line); background: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; color: inherit; flex: none; }
.help-panel__body { padding: 4px 16px 18px; display: grid; gap: 10px; overflow-y: auto; overscroll-behavior: contain; align-content: start; }
.help-panel h3 { margin: 0; font-size: 16px; line-height: 1.3; font-weight: 700; }
.help-muted { margin: 0; color: var(--help-muted); font-size: 14px; }
.help-error { margin: 0; color: #c0392b; font-size: 14px; }
.help-link { background: none; border: 0; padding: 0; color: inherit; font: inherit; font-weight: 600; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; justify-self: start; }
.help-input, .help-field input, .help-field select, .help-field textarea { width: 100%; border: 1px solid var(--help-line, #e3e1ef); border-radius: 10px; padding: 9px 11px; font: inherit; font-size: 16px; background: #fff; color: #1d1b2e; }
.help-field textarea { resize: vertical; }
.help-field { display: grid; gap: 4px; font-size: 13px; font-weight: 600; }
.help-form { display: grid; gap: 10px; }
.help-two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.help-hp { position: absolute; inset-inline-start: -9999px; width: 1px; height: 1px; opacity: 0; }
.help-btn { justify-self: start; border: 1px solid var(--help-line, #e3e1ef); background: none; color: inherit; border-radius: 10px; padding: 10px 18px; font: inherit; font-weight: 600; cursor: pointer; }
.help-btn--main { background: var(--help-accent, #1d1b2e); border-color: var(--help-accent, #1d1b2e); color: var(--help-accent-text, #fff); }
.help-btn:disabled { opacity: .55; cursor: default; }
.help-answer { border: 1px solid var(--help-line); border-radius: 10px; padding: 9px 12px; }
.help-answer summary { cursor: pointer; font-weight: 600; }
.help-answer p { margin: 8px 0 0; white-space: pre-wrap; color: var(--help-muted); }
.help-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
.help-tile { display: grid; gap: 2px; text-align: start; border: 1px solid var(--help-line); border-radius: 12px; padding: 12px; background: none; color: inherit; font: inherit; cursor: pointer; }
.help-tile span { font-size: 12.5px; color: var(--help-muted); }
.help-row { display: flex; justify-content: space-between; gap: 10px; width: 100%; text-align: start; border: 1px solid var(--help-line, #e3e1ef); border-radius: 10px; padding: 10px 12px; background: none; color: inherit; font: inherit; cursor: pointer; }
.help-row--conv { display: grid; gap: 2px; }
.help-row--conv span { color: var(--help-muted, #6b6880); font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.help-new { font-style: normal; font-size: 11.5px; font-weight: 600; margin-inline-start: 8px; padding: 1px 8px; border-radius: 999px; background: #e2f4ea; color: #17613f; }
.help-orders { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.help-order-title { margin: 0; }
.help-steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.help-steps li { display: flex; align-items: center; gap: 10px; color: var(--help-muted); }
.help-steps li::before { content: ""; width: 12px; height: 12px; border-radius: 50%; background: var(--help-line); flex: none; }
.help-steps li.is-on { color: inherit; }
.help-steps li.is-on::before { background: #1f8a5b; }
.help-attach { margin: 0; font-size: 12.5px; padding: 6px 10px; border-radius: 8px; background: rgba(0, 0, 0, .05); }
</style>
