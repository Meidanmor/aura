import { LoadingBar } from 'quasar'

let initialized = false

export function initLoadingBar(router) {
    if (initialized) return
    initialized = true

    LoadingBar.setDefaults({
        hijackFilter (url) {
            const myApiUrl = typeof window !== 'undefined' ? window.location.origin : '/';

            return url.startsWith(myApiUrl) || url.startsWith('/')
        },
        color: 'secondary',
        size: '5px',
        position: 'top'
    })

    router.beforeEach((to, from, next) => {
        LoadingBar.start()
        next()
    })

    router.afterEach(() => {
        LoadingBar.stop()
    })
}