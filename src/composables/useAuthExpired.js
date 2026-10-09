import { Dialog } from 'quasar'
import { t } from 'src/i18n/index.js'
import { localPath } from 'src/i18n/lang.js'
import { clearSessionState } from 'src/composables/useSessionCleanup.js'
let shown = false

export function initAuthPopup() {
    if (typeof window === 'undefined') return

    window.addEventListener('auth-expired', () => {
        clearSessionState()

        if (shown) return

        shown = true

        Dialog.create({
            title: t('Session Expired'),
            class: 'expired-dialog',
            message: t('Your session ended. Continue as guest or login again.'),
            ok: {label: t('Login Again'), color: 'secondary'},
            cancel: {label: t('Continue as Guest'), color: 'secondary'},
            persistent: true,
            noEscDismiss: true,
            noBackdropDismiss: true
        }).onOk(() => {
            window.location.href = localPath('/my-account')  // hard reload instead of router.push
        })
    })
}