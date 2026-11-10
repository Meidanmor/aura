import { allowedNow } from 'src/utils/custom-code.js'

function analyticsAllowed() {
  return typeof window !== 'undefined' && !!allowedNow()?.analytics
}

export function sendPersonalizationEvent(type, data = {}) {
  if (typeof window === 'undefined' || !analyticsAllowed()) return
  fetch('/wp-json/qwoo/v1/personalization/event', {
    method: 'POST', credentials: 'include', keepalive: true,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, ...data }),
  }).catch(() => {})
}

if (typeof window !== 'undefined') {
  window.addEventListener('qwoo:consent', (event) => {
    if (event.detail?.analytics === false) {
      fetch('/wp-json/qwoo/v1/personalization/event', {
        method: 'POST', credentials: 'include', keepalive: true,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'consent_withdrawn' }),
      }).catch(() => {})
    }
  })
}
