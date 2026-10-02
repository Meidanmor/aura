/**
 * Whether this build can subscribe to push notifications at all — used to
 * hide the "Enable notifications" prompts when subscribing couldn't work.
 *
 *   Website / PWA   web push needs the VAPID public key (VITE_VAPID_APP_PUBLIC_KEY).
 *   Native app      native push (APNs / FCM) needs the platform's Firebase
 *                   config bundled in the app; quasar.config.js checks for it
 *                   at build time (NATIVE_PUSH_CONFIGURED).
 */
export const pushConfigured = process.env.MODE === 'capacitor'
  ? !!process.env.NATIVE_PUSH_CONFIGURED
  : !!import.meta.env.VITE_VAPID_APP_PUBLIC_KEY
