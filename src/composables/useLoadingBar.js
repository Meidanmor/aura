import { LoadingBar } from 'quasar'

let initialized = false

// Quasar's bar also starts for every XMLHttpRequest, from the moment the app
// boots. The storefront's own calls use fetch, so the only XHRs are outside
// scripts (Clarity, pixels…): the bar follows page changes only.
export function setLoadingBarDefaults() {
    LoadingBar.setDefaults({
        hijackFilter: () => false,
        color: 'secondary',
        size: '5px',
        position: 'top'
    })
}

export function initLoadingBar(router) {
    if (initialized) return
    initialized = true

    setLoadingBarDefaults()

    router.beforeEach((to, from, next) => {
        LoadingBar.start()
        next()
    })

    router.afterEach(() => {
        LoadingBar.stop()
    })
}
