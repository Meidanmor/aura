/**
 * Native app (Capacitor) only — started by src/boot/native-api.js.
 *
 * The first screen can't render until every startup step (route preFetch,
 * MainLayout's config loads...) has finished, and the splash screen stays up
 * until then. If something never finishes, the app looks frozen on the
 * splash with no way to tell why: release builds have no console, and an
 * iPhone needs a Mac to inspect the WebView.
 *
 * So the app records what it's doing while starting — requests and storage
 * reads still in flight, JS errors, milestones — and if it isn't ready after
 * STARTUP_TIMEOUT_MS, hides the splash and shows that on screen, with
 * buttons to keep waiting, retry, or reset the app's saved data. The panel
 * removes itself as soon as the app finishes starting.
 */
const STARTUP_TIMEOUT_MS = 20000
const MAX_EVENTS = 40

const startedAt = Date.now()
const events = [] // { t, text }
const pending = new Map() // id -> { label, t }
let nextId = 1
let ready = false
let panel = null

const elapsed = (t = Date.now()) => ((t - startedAt) / 1000).toFixed(1) + 's'

export function mark(text) {
  events.push({ t: Date.now(), text: String(text).slice(0, 300) })
  if (events.length > MAX_EVENTS) events.shift()
}

/**
 * Records an operation in flight. Call the returned function when it
 * settles, optionally with its outcome (e.g. an HTTP status), to log it.
 */
export function track(label) {
  if (ready) return () => {}
  const id = nextId++
  const t = Date.now()
  pending.set(id, { label, t })
  return (outcome) => {
    pending.delete(id)
    if (outcome !== undefined && !ready) mark(`${label} → ${outcome} (${((Date.now() - t) / 1000).toFixed(1)}s)`)
  }
}

/** The app is on screen (MainLayout hid the splash). */
export function markReady() {
  if (ready) return
  ready = true
  mark('app ready')
  pending.clear()
  // One line for the logs (debug builds forward it to the native console;
  // the CI simulator run checks it).
  console.info(`[startup] ready in ${elapsed()}: ${events.map((e) => `${elapsed(e.t)} ${e.text}`).join(' | ')}`)
  panel?.remove()
  panel = null
}

function hideSplash() {
  try { window.Capacitor?.Plugins?.SplashScreen?.hide?.() } catch { /* not available */ }
}

async function resetSavedData() {
  try { localStorage.clear() } catch { /* ignore */ }
  try { sessionStorage.clear() } catch { /* ignore */ }
  try { indexedDB.deleteDatabase('qwoo-offline') } catch { /* ignore */ }
  try { await window.Capacitor?.Plugins?.CapacitorCookies?.clearAllCookies?.() } catch { /* ignore */ }
}

function button(text, onClick) {
  const b = document.createElement('button')
  b.textContent = text
  b.style.cssText = 'margin:8px 8px 0 0;padding:10px 14px;font-size:15px;border-radius:8px;border:1px solid #714850;background:#fff;color:#714850'
  b.addEventListener('click', onClick)
  return b
}

function showPanel() {
  if (ready || panel) return
  hideSplash()
  console.warn(`[startup] not ready after ${elapsed()}; waiting for: ${[...pending.values()].map((p) => p.label).join(', ') || 'nothing tracked'}`)

  const now = Date.now()
  const lines = [
    `Not ready after ${elapsed(now)}.`,
    `${navigator.userAgent.match(/OS [\d_]+/)?.[0]?.replace(/_/g, '.') || navigator.userAgent}`,
    '',
    'Still waiting for:',
    ...(pending.size
      ? [...pending.values()].map((p) => `  • ${p.label} (started at ${elapsed(p.t)})`)
      : ['  (nothing tracked — see the log below)']),
    '',
    'Log:',
    ...events.map((e) => `  ${elapsed(e.t)}  ${e.text}`),
  ]

  panel = document.createElement('div')
  panel.setAttribute('role', 'alert')
  panel.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:2147483647', 'overflow:auto', 'background:#fff', 'color:#222',
    'padding:calc(env(safe-area-inset-top) + 16px) 16px calc(env(safe-area-inset-bottom) + 16px)',
    'font:13px/1.4 -apple-system,system-ui,sans-serif',
  ].join(';')

  const title = document.createElement('h2')
  title.textContent = 'The app is taking too long to start'
  title.style.cssText = 'font-size:18px;margin:0 0 6px'
  const hint = document.createElement('p')
  hint.textContent = 'Please take a screenshot of this screen and send it to the developer.'
  hint.style.cssText = 'margin:0 0 4px'
  const details = document.createElement('pre')
  details.textContent = lines.join('\n')
  details.style.cssText = 'white-space:pre-wrap;word-break:break-word;font:12px/1.4 ui-monospace,Menlo,monospace;background:#f5f5f5;padding:10px;border-radius:8px'

  const actions = document.createElement('div')
  actions.append(
    button('Keep waiting', () => { panel?.remove(); panel = null }),
    button('Retry', () => window.location.reload()),
    button('Reset app data & retry', async () => { await resetSavedData(); window.location.reload() }),
  )

  panel.append(title, hint, actions, details)
  document.body.appendChild(panel)
}

export function startWatchdog() {
  mark('startup')
  window.addEventListener('error', (e) => {
    mark(`error: ${e.message || e.error?.message || e.type}${e.filename ? ` (${e.filename.split('/').pop()}:${e.lineno})` : ''}`)
  })
  window.addEventListener('unhandledrejection', (e) => {
    mark(`unhandled rejection: ${e.reason?.message || e.reason}`)
  })
  // Release builds have no console: keep errors/warnings for the panel.
  for (const level of ['error', 'warn']) {
    const original = console[level].bind(console)
    console[level] = (...args) => {
      if (!ready) {
        const text = args.map((a) => {
          if (typeof a === 'string') return a
          if (a?.message) return a.message
          try { return JSON.stringify(a) } catch { return String(a) }
        }).join(' ')
        mark(`console.${level}: ${text}`)
      }
      original(...args)
    }
  }
  setTimeout(showPanel, STARTUP_TIMEOUT_MS)
}
