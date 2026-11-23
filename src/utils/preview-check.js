/**
 * Accessibility checks for the Store builder (only inside the dashboard's live preview).
 *
 *   frame → dashboard  { source: 'qwoo-frontend', type: 'a11y', path, width, contrast: [...], headings: [...], noH1 }
 *
 * contrast: text that is hard to read against what is really behind it (WCAG AA: 4.5:1, large text 3:1),
 *   { ids, ratio, need, text, fg, bg, picture }. Measured on the drawn page: global colours, per-screen values,
 *   overlays and pictures are all counted. A picture is sampled where the text sits (same-origin pictures
 *   only; others are skipped, never guessed).
 * headings: a heading that skips a level (H1 → H3), { ids, level, after, text }. noH1: the page has no H1.
 * ids: the block / section ids around the text, innermost first (like a click's `pick`): the dashboard puts
 *   the note on the first one it knows (a card design's ids → the grid around it).
 *
 * Runs a moment after the page stops changing, and sends only when the result changed. Nothing for shoppers:
 * installed only in the editor frame (isEditorMode).
 */
import { getTrustedAdminOrigin, isEditorMode } from 'src/utils/config-loader.js'

const HOST = '[data-block-id], [data-section-id]'
const SKIP = '.a11y-ui, .skip-link, script, style, noscript, svg, input, textarea, select, option, [data-qwoo-check-skip]'

function idsOf(el) {
  const ids = []
  for (let h = el.closest?.(HOST); h && ids.length < 20; h = h.parentElement?.closest(HOST)) {
    ids.push(h.dataset.blockId || h.dataset.sectionId)
  }
  return ids
}

/* ---------- colours ---------- */

function parseColor(s) {
  const m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/.exec(s || '')
  if (!m) return null
  let a = m[4] === undefined ? 1 : parseFloat(m[4])
  if (m[4]?.endsWith('%')) a /= 100
  return [+m[1], +m[2], +m[3], a]
}
const over = (top, under) => {
  const a = top[3]
  return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1]
}
function lum([r, g, b]) {
  const c = (v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b)
}
function ratio(a, b) {
  const x = lum(a), y = lum(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/* ---------- what is behind a text ---------- */

// Gradient colours (their stops) stand in for samples.
function gradientStops(bgImage) {
  return (bgImage.match(/rgba?\([^)]*\)/g) || []).map(parseColor).filter(Boolean)
}
const urlOf = (bgImage) => /url\(["']?([^"')]+)["']?\)/.exec(bgImage || '')?.[1] || ''

const imgCache = new Map() // src → canvas context | null (not readable)
function readable(img) {
  const src = img.currentSrc || img.src
  if (!src) return null
  if (imgCache.has(src)) return imgCache.get(src)
  let ctx = null
  try {
    const w = Math.min(320, img.naturalWidth), h = Math.round(w * img.naturalHeight / img.naturalWidth)
    if (w && h) {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      ctx = c.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, w, h)
      ctx.getImageData(0, 0, 1, 1) // throws for a picture from another site
      ctx.qScale = w / img.naturalWidth
    }
  } catch {
    ctx = null
  }
  imgCache.set(src, ctx)
  return ctx
}
const bgImages = new Map() // url → HTMLImageElement (loading, then checked next run)
function bgImage(url) {
  if (!bgImages.has(url)) {
    const img = new Image()
    img.src = url
    bgImages.set(url, img)
  }
  const img = bgImages.get(url)
  return img.complete && img.naturalWidth ? img : null
}

// Where the picture is drawn on screen: object-fit / background-size cover (the usual), contain or fill.
function drawnBox(box, nw, nh, fit, pos) {
  let sx = box.width / nw, sy = box.height / nh
  if (fit === 'cover') sx = sy = Math.max(sx, sy)
  else if (fit === 'contain' || fit === 'scale-down') sx = sy = Math.min(sx, sy)
  const [px, py] = (pos || '50% 50%').split(' ').map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : 0.5))
  return { left: box.left + (box.width - nw * sx) * (isNaN(px) ? 0.5 : px), top: box.top + (box.height - nh * sy) * (isNaN(py) ? 0.5 : py), sx, sy }
}
function samplePicture(img, box, fit, pos, rect) {
  const ctx = readable(img)
  if (!ctx) return null
  const d = drawnBox(box, img.naturalWidth, img.naturalHeight, fit, pos)
  const out = []
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 3; j++) {
      const x = rect.left + rect.width * (i + 0.5) / 5
      const y = rect.top + rect.height * (j + 0.5) / 3
      const ix = Math.floor((x - d.left) / d.sx * ctx.qScale)
      const iy = Math.floor((y - d.top) / d.sy * ctx.qScale)
      if (ix < 0 || iy < 0 || ix >= ctx.canvas.width || iy >= ctx.canvas.height) continue
      const p = ctx.getImageData(ix, iy, 1, 1).data
      out.push([p[0], p[1], p[2], 1])
    }
  }
  return out.length ? out : null
}

const covers = (el, cx, cy) => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.left <= cx && r.right >= cx && r.top <= cy && r.bottom >= cy
}
const positioned = (cs) => cs.position === 'absolute' || cs.position === 'fixed'

/**
 * The layers under a text, nearest first: { color } or { samples } (a picture or gradient) or { unknown }
 * (a video, a picture we can't read). Walks up from the text; at each parent, the positioned children drawn
 * before the one we came from (a hero's picture, its tint) and the parent's ::before / own background.
 */
function layersUnder(el, rect) {
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2
  const layers = []
  let floating = false // a fixed / sticky header: what's behind it is in another part of the page
  // `opacity`: a pseudo-element's own (a section's tint is a black ::before at opacity .3).
  const addBox = (node, cs, opacity = 1) => {
    const color = parseColor(cs.backgroundColor)
    const image = cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage : ''
    if (color && color[3] * opacity > 0.01) layers.push({ color: [color[0], color[1], color[2], color[3] * opacity] })
    if (image) {
      if (/gradient\(/.test(image)) {
        const stops = gradientStops(image).map((c) => [c[0], c[1], c[2], c[3] * opacity])
        if (stops.length) layers.push({ samples: stops, gradient: true })
      }
      const url = urlOf(image)
      if (url) {
        const img = bgImage(url)
        const samples = img && node ? samplePicture(img, node.getBoundingClientRect(), cs.backgroundSize === 'contain' ? 'contain' : cs.backgroundSize === '100% 100%' ? 'fill' : 'cover', cs.backgroundPosition, rect) : null
        // A see-through picture is mixed with what is under it: too unsure, skipped.
        layers.push(samples && opacity >= 0.95 ? { samples, picture: true } : { unknown: true })
      }
    }
  }
  const addMedia = (node) => {
    if (node.tagName === 'IMG' && node.complete && node.naturalWidth) {
      const cs = getComputedStyle(node)
      if (parseFloat(cs.opacity) < 0.05) return
      const samples = samplePicture(node, node.getBoundingClientRect(), cs.objectFit, cs.objectPosition, rect)
      layers.push(samples ? { samples, picture: true } : { unknown: true })
    } else if (node.tagName === 'VIDEO' || node.tagName === 'CANVAS' || node.tagName === 'IFRAME') {
      layers.push({ unknown: true })
    }
  }
  // Positioned layers inside a sibling (a picture wrapped in a div): the deepest media / coloured box.
  const addSibling = (sib) => {
    const cs = getComputedStyle(sib)
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) return
    if (/^(IMG|VIDEO|CANVAS|IFRAME)$/.test(sib.tagName)) return addMedia(sib)
    const inner = [...sib.querySelectorAll('img, video, canvas')].reverse().find((m) => covers(m, cx, cy))
    addBox(sib, cs)
    if (inner) addMedia(inner)
  }
  let child = el
  for (let node = el; node && node !== document.documentElement; child = node, node = node.parentElement) {
    if (node !== el) {
      // Siblings drawn before `child`, nearest first (later in the page = drawn on top).
      const kids = [...node.children]
      for (let i = kids.indexOf(child) - 1; i >= 0; i--) {
        const sib = kids[i]
        if (!covers(sib, cx, cy)) continue
        // A positioned box covers everything before it; otherwise only positioned siblings and pictures sit under.
        if (!positioned(getComputedStyle(child)) && !positioned(getComputedStyle(sib)) && !/^(IMG|VIDEO|CANVAS)$/.test(sib.tagName)) continue
        addSibling(sib)
      }
      // Later siblings that sit under it (z-index below 0).
      for (const sib of kids.slice(kids.indexOf(child) + 1)) {
        const cs = getComputedStyle(sib)
        if (positioned(cs) && parseInt(cs.zIndex, 10) < 0 && covers(sib, cx, cy)) addSibling(sib)
      }
    }
    const cs = getComputedStyle(node)
    // ::before / ::after (a section's background picture and its tint): the higher z-index on top.
    const pseudos = ['::after', '::before'].map((name, i) => ({ ps: getComputedStyle(node, name), i }))
      .filter(({ ps }) => ps.content && ps.content !== 'none' && positioned(ps))
      .sort((a, b) => (parseInt(b.ps.zIndex, 10) || 0) - (parseInt(a.ps.zIndex, 10) || 0) || a.i - b.i)
    for (const { ps } of pseudos) addBox(node, ps, parseFloat(ps.opacity))
    addBox(node, cs)
    if (layers.some((l) => l.unknown || (l.color && l.color[3] >= 1) || l.samples?.every((s) => s[3] >= 1))) {
      // Found only past a floating header (the page behind it): it changes while scrolling, can't be judged here.
      if (floating) layers.unshift({ unknown: true })
      return layers
    }
    if (cs.position === 'fixed' || cs.position === 'sticky') floating = true
  }
  // Nothing solid under a floating header: the page scrolls under it, so it can't be judged here.
  if (floating) layers.push({ unknown: true })
  return layers
}

/** The backgrounds a text is read against (one, or a picture's samples), or null when it can't be known. */
function backgrounds(layers) {
  const base = layers.findIndex((l) => l.unknown || (l.color && l.color[3] >= 1) || (l.samples && l.samples.every((s) => s[3] >= 1)))
  if (base >= 0 && layers[base].unknown) return null
  let bgs = base >= 0 ? (layers[base].color ? [layers[base].color] : layers[base].samples) : [[255, 255, 255, 1]]
  const top = base >= 0 ? layers.slice(0, base) : layers
  for (const l of top.reverse()) {
    if (l.color) bgs = bgs.map((b) => over(l.color, b))
    else if (l.samples) bgs = bgs.flatMap((b) => l.samples.map((s) => over(s, b)))
  }
  return { bgs, picture: layers.slice(0, base + 1).some((l) => l.picture || l.gradient) }
}

function visible(el) {
  const r = el.getBoundingClientRect()
  if (r.width < 1 || r.height < 1) return null
  let opacity = 1
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const cs = getComputedStyle(n)
    if (cs.display === 'none' || cs.visibility === 'hidden') return null
    opacity *= parseFloat(cs.opacity)
  }
  // Faded or still animating in: can't be judged now.
  return opacity < 0.9 ? null : r
}

function checkContrast(root, budget) {
  const out = []
  const seen = new Set()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (performance.now() > budget) break
    const el = t.parentElement
    if (!el || seen.has(el) || !t.nodeValue.trim()) continue
    seen.add(el)
    if (el.closest(SKIP) || !el.closest(HOST)) continue
    const rect = visible(el)
    if (!rect) continue
    const cs = getComputedStyle(el)
    const fgRaw = parseColor(cs.color)
    if (!fgRaw || fgRaw[3] === 0) continue
    const layers = layersUnder(el, rect)
    const found = backgrounds(layers)
    if (!found) continue
    const size = parseFloat(cs.fontSize)
    const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700)
    const need = large ? 3 : 4.5
    // A picture: judged where most of the text sits (the 25th worst of the samples), not the single worst pixel.
    const ratios = found.bgs.map((bg) => ({ r: ratio(over(fgRaw, bg), bg), bg })).sort((a, b) => a.r - b.r)
    const pick = ratios[Math.min(ratios.length - 1, Math.floor(ratios.length * (found.picture ? 0.25 : 0)))]
    if (pick.r >= need) continue
    out.push({
      ids: idsOf(el),
      ratio: Math.round(pick.r * 10) / 10,
      need,
      text: t.nodeValue.trim().replace(/\s+/g, ' ').slice(0, 60),
      fg: hex(over(fgRaw, pick.bg)),
      bg: hex(pick.bg),
      picture: found.picture,
    })
  }
  return out
}

function checkHeadings(root) {
  const out = []
  let prev = 0, hasH1 = false
  for (const h of root.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"][aria-level]')) {
    if (h.closest('.a11y-ui') || !visible(h) || !h.textContent.trim()) continue
    const level = h.getAttribute('role') === 'heading' ? parseInt(h.getAttribute('aria-level'), 10) : +h.tagName[1]
    if (!level) continue
    if (level === 1) hasH1 = true
    if (prev && level > prev + 1) out.push({ ids: idsOf(h), level, after: prev, text: h.textContent.trim().replace(/\s+/g, ' ').slice(0, 60) })
    prev = level
  }
  return { headings: out, noH1: !hasH1 }
}

export function installPreviewCheck() {
  if (typeof window === 'undefined' || !isEditorMode()) return
  if (new URLSearchParams(window.location.search).get('qwoo_view') === '1') return
  const origin = getTrustedAdminOrigin()
  if (!origin) return
  let timer = 0, last = ''
  const run = () => {
    const root = document.getElementById('q-app')
    if (!root) return
    try {
      const budget = performance.now() + 250
      const msg = { path: location.pathname, width: window.innerWidth, contrast: checkContrast(root, budget), ...checkHeadings(root) }
      // At most 40 notes: enough to see the pattern, small to send.
      msg.contrast = msg.contrast.slice(0, 40)
      const key = JSON.stringify(msg)
      if (key === last) return
      last = key
      window.parent.postMessage({ source: 'qwoo-frontend', type: 'a11y', ...msg }, origin)
    } catch { /* a check never breaks the preview */ }
  }
  // Carousels and scroll scenes keep changing the page: after 6 s of changes it runs anyway.
  let since = 0
  const later = (ms = 1500) => {
    clearTimeout(timer)
    const now = Date.now()
    if (!since) since = now
    if (now - since > 6000) ms = 0
    timer = setTimeout(() => {
      since = 0
      if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 1000 })
      else run()
    }, ms)
  }
  new MutationObserver(() => later()).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'src'], characterData: true })
  window.addEventListener('resize', () => later())
  window.addEventListener('load', () => later(2500))
  // Background pictures load after the first run: look again once they're in.
  setInterval(() => { if ([...bgImages.values()].some((i) => i.complete && i.naturalWidth && !i.qChecked && (i.qChecked = true))) later(200) }, 3000)
  later(2500)
}

// For a check by hand in the browser console (no effect on its own).
export { checkContrast, checkHeadings }
