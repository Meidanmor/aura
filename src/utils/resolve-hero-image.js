import {resolveLocalAsset} from "src/utils/server/resolve-local-resource.js";
import { liveUrl } from 'src/utils/native-app'

/**
 * The storefront's own copy of a published image (logo, hero), else the
 * backend URL. Configs published since images got their own names say
 * exactly where the copy is (localPath: "/branding/12-logo.svg"), so nothing
 * has to be looked up; older configs are checked for a copy by file name.
 */
export async function resolveHeroImageSrc(heroImageUrl, path='homepage-hero', origin='', localPath='') {
    if (!heroImageUrl) return ''

    if (typeof localPath === 'string' && /^\/(homepage-hero|branding)\/[^/]+$/.test(localPath)) {
        return liveUrl(localPath)
    }

    return resolveLocalAsset({
        url: heroImageUrl,
        localFolder: path,
        origin: origin
    })
}
