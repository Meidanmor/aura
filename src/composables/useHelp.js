/**
 * The store's Help button and the shopper's messages (dashboard: Customers →
 * Inbox → Settings). Browser only.
 *
 * The store sends the button's look and texts with the tracking settings
 * (window.__QWOO_CODE__.help; nothing = the button is off). The panel
 * (components/app/HelpButton.vue) and My account → Messages talk to the store's
 * routes: write a message, read and answer a conversation by its key, the
 * signed-in shopper's conversations and last orders, and the order lookup.
 *
 * A guest's conversation keys are kept for this browser tab only
 * (sessionStorage): the lasting way back is the link in the confirmation email.
 * What a shopper writes is only ever shown as plain text.
 */
import { reactive } from 'vue'
import { fetchWithToken } from 'src/composables/useApiFetch.js'

const API = '/wp-json/qwoo/v1/inbox'
const KEYS = 'qwoo_help_threads'
const KEY_RE = /^\d{1,12}\.[a-f0-9]{40}$/

/** What is open: the panel, its view, and what "Write to us" starts with. */
export const help = reactive({
  open: false,
  view: 'home', // home | order | write | thread | list
  order: '', // an order number carried from the lookup or from My account
  orderEmail: '',
  thread: '', // the key of the conversation on screen
})

/** The store's Help button settings, or null (off, or the Store builder's preview). */
export function helpConfig() {
  if (typeof window === 'undefined') return null
  const h = window.__QWOO_CODE__?.help
  return h && typeof h === 'object' ? h : null
}

/** Opens the panel: openHelp(), openHelp({ view: 'write', order: '1482' }), openHelp({ thread: key }). */
export function openHelp(to = {}) {
  help.order = to.order ? String(to.order) : ''
  help.orderEmail = to.orderEmail ? String(to.orderEmail) : ''
  help.thread = to.thread && KEY_RE.test(to.thread) ? to.thread : ''
  help.view = help.thread ? 'thread' : (['order', 'write', 'list'].includes(to.view) ? to.view : 'home')
  help.open = true
}

export function closeHelp() {
  help.open = false
}

/* ---------------- this tab's conversations (guests) ---------------- */

export function keptThreads() {
  try {
    const list = JSON.parse(sessionStorage.getItem(KEYS) || '[]')
    return Array.isArray(list) ? list.filter((k) => KEY_RE.test(k)).slice(0, 5) : []
  } catch {
    return []
  }
}

function keepThread(k) {
  if (!KEY_RE.test(k)) return
  try { sessionStorage.setItem(KEYS, JSON.stringify([k, ...keptThreads().filter((x) => x !== k)].slice(0, 5))) } catch { /* private mode */ }
}

/* ---------------- the store ---------------- */

async function call(path, options) {
  let res
  try {
    res = await fetchWithToken(`${API}/${path}`, options, null, { skipNonceRetry: true })
  } catch {
    return { ok: false, status: 0, data: null }
  }
  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
}

const post = (path, body) => call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

/** "Where is my order?": { found, order } or { error }. */
export async function lookupOrder(number, email) {
  const r = await post('order', { number: String(number).replace(/\D/g, '').slice(0, 12), email: String(email).trim() })
  if (!r.ok) return { error: r.data?.message || '' }
  return r.data || { found: false }
}

/** "Write to us": { k } (the new conversation's key) or { error }. */
export async function writeToStore(fields) {
  const r = await post('write', fields)
  if (!r.ok || !r.data?.ok) return { error: r.data?.message || '' }
  if (r.data.k) keepThread(r.data.k)
  return { k: r.data.k || '' }
}

/** A conversation by its key: { topic, status, messages: [{ id, mine, body, at }] }, or null. */
export async function loadThread(k) {
  if (!KEY_RE.test(k)) return null
  const r = await call(`thread?k=${encodeURIComponent(k)}`, { method: 'GET' })
  return r.ok ? r.data : null
}

/** The shopper's answer in a conversation: the conversation again, or { error }. */
export async function answerThread(k, message, website = '') {
  const r = await post('thread', { k, message, website })
  return r.ok ? r.data : { error: r.data?.message || '' }
}

/** The signed-in shopper's conversations and last orders: { conversations, orders }, or null. */
export async function loadMine() {
  const r = await call('mine', { method: 'GET' })
  return r.ok ? r.data : null
}
