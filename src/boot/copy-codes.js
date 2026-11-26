/**
 * Codes to copy inside any text (browser only; owner-approved prototype, 2026-11-26).
 *
 * The Store builder's "Code to copy" button wraps a word in a heading or a text as
 * <span data-copy="CODE" data-look="underline|tag|bold" data-end="text|hide" data-ok="1|0" data-ends="Y-m-d">.
 * The store checks the code when the page is saved (data-ok, data-ends). Here: the code becomes a button
 * for keyboards and screen readers, and a tap or Enter copies it and shows "Copied" next to it. A code
 * that ended (or ends today, by the shopper's own date) only says so. The looks are in app.css.
 */
import { t } from 'src/i18n/index.js'

const SEL = '[data-copy]'
let bubble = null
let hideTimer = 0

function today () {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ended (el) {
  const ends = el.getAttribute('data-ends') || ''
  return el.getAttribute('data-ok') === '0' || (ends !== '' && ends < today())
}

/** Buttons for keyboards and screen readers, once per code. */
function prepare (root) {
  const list = root.querySelectorAll ? root.querySelectorAll(`${SEL}:not([data-copy-ready])`) : []
  for (const el of list) {
    el.setAttribute('data-copy-ready', '')
    if (ended(el)) {
      el.setAttribute('data-ok', '0')
      continue
    }
    el.setAttribute('role', 'button')
    el.setAttribute('tabindex', '0')
    el.setAttribute('aria-label', t('Copy the code {code}', { code: el.getAttribute('data-copy') || '' }))
  }
}

function say (el, text) {
  if (!bubble) {
    bubble = document.createElement('div')
    bubble.className = 'copy-code-bubble'
    bubble.setAttribute('role', 'status')
    bubble.setAttribute('aria-live', 'polite')
    document.body.appendChild(bubble)
  }
  bubble.textContent = text
  const r = el.getBoundingClientRect()
  bubble.style.left = `${Math.round(r.left + r.width / 2)}px`
  bubble.style.top = `${Math.round(r.top - 8)}px`
  bubble.classList.add('is-on')
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => bubble && bubble.classList.remove('is-on'), 1600)
}

async function copy (el) {
  if (ended(el)) {
    say(el, t('This code has ended'))
    return
  }
  const code = el.getAttribute('data-copy') || ''
  try {
    await navigator.clipboard.writeText(code)
    say(el, t('Copied'))
  } catch {
    // No clipboard here: select the code so it can be copied by hand.
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    say(el, t('Select and copy the code'))
  }
}

export default () => {
  if (typeof document === 'undefined') return
  document.addEventListener('click', (e) => {
    const el = e.target instanceof Element ? e.target.closest(SEL) : null
    if (!el) return
    // A code inside a link copies instead of leaving the page.
    if (el.closest('a[href]')) e.preventDefault()
    copy(el)
  })
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const el = e.target instanceof Element && e.target.matches(SEL) ? e.target : null
    if (!el) return
    e.preventDefault()
    copy(el)
  })
  // Codes come with every page and every Store builder change: prepare new ones as they appear.
  let pending = false
  const run = () => { pending = false; prepare(document) }
  new MutationObserver(() => {
    if (pending) return
    pending = true
    setTimeout(run, 120)
  }).observe(document.body, { childList: true, subtree: true })
  // The server's page is left as it is until the app took it over (no hydration differences); taps work before that.
  if (document.readyState === 'complete') setTimeout(run, 300)
  else window.addEventListener('load', () => setTimeout(run, 300), { once: true })
}
