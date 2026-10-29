export function getApiOrigin(ssrContext) {
    if (import.meta.env.SSR) {
        const req = ssrContext?.req
        if (!req) throw new Error('getApiOrigin() called during SSR without ssrContext.req')
        // QWOO_DEV_HTTP: the local test setup (qwoo-dev) serves the dev server on plain http.
        const protocol = req.headers['x-forwarded-proto'] || (process.env.QWOO_DEV_HTTP ? 'http' : 'https')
        const host = req.headers['x-forwarded-host'] || req.headers.host
        return `${protocol}://${host}`
    }
    return '' // client: relative path resolves against current page automatically
}