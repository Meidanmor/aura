import { computed, inject, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { afterSignInPath, signedIn, useAccount, useSiteAccount } from 'src/composables/useAccount.js'

/**
 * What the Sign In and Sign Up Form blocks share: the account state, whether
 * Google shows (the block's switch and the store's Client ID), the button
 * colours, and what happens afterwards (the block's "Afterwards").
 */
export function useAuthForm(data) {
  const route = useRoute()
  const router = useRouter()
  const site = useSiteAccount()
  const { user, signedIn: isIn } = useAccount()
  const d = computed(() => data().data || {})
  const target = computed(() => afterSignInPath(d.value))
  // Signing in here: the form stays until it's done (or the "done" step would be lost with it).
  const working = ref(false)
  const isInNow = computed(() => isIn.value && !working.value)
  // Inside a popup: signing in closes it.
  const popup = inject('qwooPopup', null)
  return {
    d,
    site,
    user,
    isIn: isInNow,
    working,
    setWorking: (on) => { working.value = !!on },
    google: computed(() => d.value.show_social !== false && !!site.value.google),
    // Google's page sends the customer back here, or straight to the chosen page.
    returnTo: computed(() => target.value || route.fullPath),
    buttonBg: computed(() => resolveGlobalColor(d.value.button_bg) || ''),
    buttonText: computed(() => resolveGlobalColor(d.value.button_text) || ''),
    hidden: computed(() => isInNow.value && d.value.when_signed_in === 'hide'),
    done(u) {
      working.value = false
      signedIn(u)
      popup?.close()
      if (target.value && target.value !== route.path) router.push(target.value)
    },
  }
}
