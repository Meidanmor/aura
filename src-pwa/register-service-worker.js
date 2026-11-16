import { register } from 'register-service-worker'
//import { useRouter } from 'vue-router';

//const router = useRouter();

// The ready(), registered(), cached(), updatefound() and updated()
// events passes a ServiceWorkerRegistration instance in their arguments.
// ServiceWorkerRegistration: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration

// We wait for the 'load' event, which fires when the initial
// resources (like your Hero Image) are finished.

  // We add an extra delay to ensure the "Main Thread" has
  // finished hydrating the page and painting the LCP.
  // Safari (every iPhone) has no requestIdleCallback: calling it threw before the app started,
  // so nothing on the page worked there (menu, booking widget…). After load + 2 s instead.
  const whenIdle = (fn) => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(fn, { timeout: 5000 })
      return
    }
    const later = () => setTimeout(fn, 2000)
    if (document.readyState === 'complete') later()
    else window.addEventListener('load', later, { once: true })
  }
  whenIdle(() => {

    register(process.env.SERVICE_WORKER_FILE, {
      //ready(/*registration*/) {
      //  console.log('Service worker is active.')
      //},
      //registered(/*registration*/) {
      //  console.log('Service worker has been registered.')
      //},
      //error(err) {
      //  console.error('Error during service worker registration:', err)
      //}
      // Keep your other hooks (offline, error, etc.) if you need them
    })
  }) // 4 seconds is the "sweet spot" for slow 4G devices