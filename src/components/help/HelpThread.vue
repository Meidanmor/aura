<template>
  <div class="help-thread" data-clarity-mask="True">
    <div v-if="!thread && loading" class="help-thread__wait"><q-spinner size="24px" /></div>
    <p v-else-if="!thread" class="help-thread__gone">{{ t('This conversation isn\'t available any more.') }}</p>
    <template v-else>
      <p v-if="thread.order" class="help-thread__about">{{ t('Order #{n}', { n: thread.order }) }}</p>
      <div ref="listEl" class="help-thread__list" aria-live="polite">
        <!-- A shopper's or the store's words: always plain text. -->
        <div v-for="m in thread.messages" :key="m.id" class="help-msg" :class="m.mine ? 'help-msg--me' : 'help-msg--us'">
          <small>{{ m.mine ? t('You') : storeName }} · {{ when(m.at) }}</small>
          <span class="help-msg__text">{{ m.body }}</span>
        </div>
      </div>
      <p v-if="notice" class="help-thread__note" role="status">{{ notice }}</p>
      <p v-if="error" class="help-thread__error" role="alert">{{ error }}</p>
      <form class="help-thread__form" @submit.prevent="send">
        <label class="help-field">
          <span>{{ t('Your answer') }}</span>
          <textarea v-model="text" rows="3" maxlength="4000" required />
        </label>
        <input v-model="website" class="help-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button type="submit" class="help-btn help-btn--main" :disabled="sending || !text.trim()">{{ sending ? t('Sending…') : t('Send') }}</button>
      </form>
    </template>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { answerThread, loadThread } from 'src/composables/useHelp.js'
import { useI18n } from 'src/i18n/index.js'

/**
 * One conversation with the store: the messages, and the shopper's answer.
 * While it is on screen it asks the store for news every 12 seconds (only
 * while the tab is visible), for 5 minutes: a quick owner feels like chat.
 */
const props = defineProps({
  threadKey: { type: String, required: true },
  note: { type: String, default: '' }, // shown once above the form ("We got it…")
})
const { t } = useI18n()
const storeName = (typeof document !== 'undefined' && document.querySelector('meta[property="og:site_name"]')?.content) || t('The store')

const thread = ref(null)
const loading = ref(true)
const text = ref('')
const website = ref('')
const sending = ref(false)
const error = ref('')
const notice = ref(props.note)
const listEl = ref(null)
let timer = 0
let polls = 0

const when = (at) => {
  try {
    return new Date(at * 1000).toLocaleString(document.documentElement.lang || undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function toBottom() {
  nextTick(() => { if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight })
}

async function refresh(first = false) {
  const data = await loadThread(props.threadKey)
  loading.value = false
  if (!data) {
    if (first) thread.value = null
    return
  }
  const grew = !thread.value || data.messages.length !== thread.value.messages.length
  thread.value = data
  if (grew) toBottom()
}

function schedule() {
  clearTimeout(timer)
  if (polls >= 25) return
  timer = setTimeout(async () => {
    polls++
    if (document.visibilityState === 'visible') await refresh()
    schedule()
  }, 12000)
}

async function send() {
  const body = text.value.trim()
  if (!body || sending.value) return
  sending.value = true
  error.value = ''
  const data = await answerThread(props.threadKey, body, website.value)
  sending.value = false
  if (!data || data.error !== undefined) {
    error.value = data?.error || t('Could not send. Please check your connection and try again.')
    return
  }
  thread.value = data
  text.value = ''
  notice.value = t('Sent. We\'ll answer here and by email.')
  polls = 0
  schedule()
  toBottom()
}

function start() {
  loading.value = true
  thread.value = null
  polls = 0
  refresh(true).then(schedule)
}
onMounted(start)
watch(() => props.threadKey, start)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<style scoped>
.help-thread { display: grid; gap: 10px; min-height: 0; }
.help-thread__wait { display: grid; place-items: center; padding: 24px 0; }
.help-thread__gone, .help-thread__about { margin: 0; color: var(--help-muted, #6b6880); font-size: 14px; }
.help-thread__list { display: grid; gap: 8px; align-content: start; max-height: 320px; overflow-y: auto; overscroll-behavior: contain; }
.help-msg { max-width: 88%; padding: 8px 12px; border-radius: 14px; background: rgba(0, 0, 0, .06); justify-self: start; overflow-wrap: anywhere; }
.help-msg--me { background: var(--help-accent, #1d1b2e); color: var(--help-accent-text, #fff); justify-self: end; }
.help-msg small { display: block; font-size: 11.5px; opacity: .75; margin-bottom: 2px; }
.help-msg__text { white-space: pre-wrap; }
.help-thread__note { margin: 0; padding: 8px 12px; border-radius: 10px; background: #e2f4ea; color: #17613f; font-size: 14px; }
.help-thread__error { margin: 0; color: #c0392b; font-size: 14px; }
.help-thread__form { display: grid; gap: 8px; }
</style>
