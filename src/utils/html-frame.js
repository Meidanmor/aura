/**
 * The HTML block's sealed frame (Store builder → HTML, 2026-11-23). The owner's code never goes into the store page:
 * it is sent to a tiny page on its own address (PhpstormProjects/openly-frames, deployed at HTML_FRAME_ORIGIN), which
 * writes it into itself. That address must never be a store's own: the frame gets allow-same-origin so tools that
 * need their own storage (booking calendars, form tools) work, which is only safe on another address.
 * The store's CSP lets it in through frame-src (src-ssr/custom-code.js).
 */
export const HTML_FRAME_ORIGIN = 'https://frames.myopenly.com'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The store's look as CSS variables (+ the @font-face rules of its fonts, when the browser lets us read them). */
export function storeLook() {
  const css = getComputedStyle(document.documentElement)
  const v = (name) => css.getPropertyValue(name).trim()
  const look = {
    '--store-font': v('--qf-text'),
    '--store-headings-font': v('--qf-headings') || v('--qf-text'),
    '--store-text': v('--q-text'),
    '--store-primary': v('--q-primary'),
    '--store-secondary': v('--q-secondary'),
  }
  const vars = Object.entries(look).filter(([, value]) => value && !/[<>{};]/.test(value)).map(([k, value]) => `${k}:${value}`).join(';')
  const families = [look['--store-font'], look['--store-headings-font']].join(',').toLowerCase()
  const faces = []
  try {
    for (const sheet of document.styleSheets) {
      let rules
      try { rules = sheet.cssRules } catch { continue }
      for (const rule of rules || []) {
        if (faces.length >= 24) break
        if (rule.type !== 5) continue // CSSFontFaceRule
        const family = String(rule.style.getPropertyValue('font-family') || '').replace(/["']/g, '').trim().toLowerCase()
        if (!family || !families.includes(family)) continue
        // Font addresses become absolute: the frame lives elsewhere.
        const base = sheet.href || location.href
        faces.push(rule.cssText.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, u) => {
          try { return `url("${new URL(u, base).href}")` } catch { return m }
        }))
      }
    }
  } catch { /* no fonts then: the fallback stack */ }
  return { vars, faces: faces.join('\n') }
}

/**
 * The whole document the frame writes. o: { code, url, title, theme, transparent, linksHere, auto }.
 * The height script reports the content's height (not secret) so the block grows and shrinks with it.
 */
export function frameDocument(o) {
  const root = document.documentElement
  const dir = root.getAttribute('dir') === 'rtl' ? 'rtl' : 'ltr'
  const lang = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(root.lang || '') ? root.lang : 'en'
  const look = o.theme ? storeLook() : { vars: '', faces: '' }
  const bg = o.transparent ? 'transparent' : '#fff'
  const base = `html,body{margin:0;background:${bg}}`
  let style, body
  if (o.url) {
    style = `${base}html,body{height:100%;overflow:hidden}iframe{display:block;border:0;width:100%;height:100%}`
    body = `<iframe src="${esc(o.url)}" title="${esc(o.title || '')}" allow="fullscreen; clipboard-write; autoplay; picture-in-picture; payment; web-share"></iframe>`
  } else {
    style = `${look.faces}\n:root{${look.vars}}${base}body{display:flow-root${o.theme ? ';font-family:var(--store-font,system-ui,sans-serif);color:var(--store-text,inherit)' : ''}}`
    body = o.code || ''
  }
  const sizer = o.auto && !o.url
    ? '<script>(function(){var last=0;function s(){var b=document.body;if(!b)return;var h=Math.ceil(Math.max(b.scrollHeight,b.getBoundingClientRect().height));if(h!==last){last=h;parent.postMessage({openlyFrame:"height",h:h},"*")}}' +
      'if(window.ResizeObserver){var r=new ResizeObserver(s);r.observe(document.documentElement);document.body&&r.observe(document.body)}' +
      'addEventListener("load",s);setInterval(s,1500);s()})()</' + 'script>'
    : ''
  return `<!doctype html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<base target="${o.linksHere ? '_top' : '_blank'}"><style>${style}</style></head><body>${body}${sizer}</body></html>`
}
