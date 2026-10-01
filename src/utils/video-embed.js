/**
 * YouTube / Vimeo link parsing and embed URLs, shared by the Video block and
 * video backgrounds. Embeds always use the two player hosts allowed by the
 * CSP frame-src (src-ssr/middlewares/render.js).
 */

export function youtubeId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/)
  return m ? m[1] : ''
}

export function vimeoId(url) {
  const m = String(url || '').match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return m ? m[1] : ''
}

export const youtubeThumbnail = (id) => (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '')

/** Muted, looping, control-less player URL for a video background. */
export function backgroundEmbedUrl(kind, id) {
  if (!id) return ''
  if (kind === 'youtube') {
    const params = new URLSearchParams({
      autoplay: 1, mute: 1, loop: 1, playlist: id, // YouTube only loops a playlist
      controls: 0, disablekb: 1, fs: 0, rel: 0, playsinline: 1, iv_load_policy: 3,
    })
    return `https://www.youtube-nocookie.com/embed/${id}?${params}`
  }
  if (kind === 'vimeo') {
    // background=1: autoplay, loop, muted and no controls in one flag.
    return `https://player.vimeo.com/video/${id}?${new URLSearchParams({ background: 1, dnt: 1 })}`
  }
  return ''
}
