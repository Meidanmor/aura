/**
 * /__pay-return: where a payment page that opened inside the checkout (Cardcom's card form in a
 * frame) sends the frame when it's done. The store's own pages refuse to show inside another
 * site's page (frame-ancestors), so this tiny page may (only inside Cardcom's page, inside this
 * store), and moves the whole window on: to the thank-you page (paid, or waiting for the
 * store's confirmation) or back to checkout (not paid). Only those two places, and only the
 * order's known fields, are passed on.
 *
 * It comes before the "Coming soon" check: inside Cardcom's frame the browser doesn't send the
 * preview cookie, and the page shows nothing of the store.
 */
import { randomBytes } from 'node:crypto'

const FIELDS = { orderId: /^\d{1,12}$/, order_key: /^wc_order_[A-Za-z0-9]{1,40}$/, billing_email: /^[^\s<>"']{3,200}$/, pm: /^[a-z0-9_]{1,40}$/ }
const FRAME_HOSTS = 'https://secure.cardcom.solutions https://*.cardcom.solutions https://*.cardcom.co.il'

export function payReturnMiddleware() {
  return (req, res, next) => {
    if (req.method !== 'GET' || !(req.url === '/__pay-return' || req.url.startsWith('/__pay-return?'))) return next()
    const query = new URL(req.url, 'http://x').searchParams
    let target = '/checkout'
    if (query.get('to') === 'thank-you') {
      const out = new URLSearchParams()
      for (const [name, re] of Object.entries(FIELDS)) {
        const value = query.get(name) || ''
        if (re.test(value)) out.set(name, value)
      }
      if (out.get('orderId') && out.get('order_key')) target = '/thank-you?' + out.toString()
    }
    const nonce = randomBytes(16).toString('base64')
    res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'self' ${FRAME_HOSTS}`)
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    // The top window is this store (the checkout): moving it is allowed. Opened on its own, it just goes there.
    const to = JSON.stringify(target).replace(/</g, '\\u003c')
    res.end(`<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>…</title><script nonce="${nonce}">(function(){var to=${to};try{if(window.top!==window.self){window.top.location.replace(to);return}}catch(e){}window.location.replace(to)})()</script>`)
  }
}
