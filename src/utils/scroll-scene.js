/**
 * Scroll scenes and moving backgrounds (Store builder, 2026-11-22; plan: plans/scroll-scenes.md in the platform notes).
 *
 * A top-level section with "When scrolling" = Move sideways or Play a story is drawn by SectionTemplate as
 *   <div class="sb-scene" v-scene="conf"> <section class="sb-scene-pin"> … </section> </div>
 * The outer box is tall (the pinned screen + the scroll the scene uses, --sc-run); the section inside is
 * `position: sticky` under the header, so the browser holds it in place with no script (smooth on iPhones).
 * This file only measures and, while a scene is near the screen, turns the scroll position into progress
 * (0-1) once per frame and writes transforms / opacity: never anything that makes the browser lay the page out.
 *
 * No animation library: GSAP's licence forbids tools that let people build animations without code, and the
 * native CSS scroll timelines are too new (Firefox 159, iOS 26) and can't count numbers or move videos.
 *
 * Off (the section is just a normal section, everything visible): visitors who asked for less motion, phones
 * when the owner chose "A normal section", and a sideways row on phones with "Simpler" (a swipe row, app.css).
 * The server's HTML and visitors without scripts get the CSS state, never a blank.
 *
 * Also here: "Depth While Scrolling" on any section's background (v-bg-depth), the Store builder's "Preview at"
 * message (scene_preview) and the "Tilt toward the mouse" hover effect (installTilt).
 */
import { isEditorMode, isEditorMessage } from './config-loader.js'

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const isPhone = () => window.innerWidth < 768
const headerOffset = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--qwoo-header-stuck')) || 0

const EASE = {
  smooth: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  soft: (k) => 1 - Math.pow(1 - k, 3),
  steady: (k) => k,
  bouncy: (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2) },
}
const SPEED = { slow: 1.5, normal: 1, fast: 0.7 }

/* ------------------------------------------------------------------ */
/* One loop for every scene and moving background on the page          */
/* ------------------------------------------------------------------ */

const scenes = new Set()
const depths = new Set()
let frame = 0
let frameAt = 0
let installed = false
let io = null

function drawAll() {
  frame = 0
  for (const s of scenes) if (s.near) s.update()
  for (const d of depths) if (d.near) d.update()
}
let fallback = 0
function schedule() {
  // A frame asked for while the tab was in the background (or a throttled frame) may never come: ask again
  // after a moment, and draw from a timer if no frame came at all, so a scene never stays at a stale point.
  if (frame && performance.now() - frameAt < 250) return
  if (frame) cancelAnimationFrame(frame)
  frameAt = performance.now()
  frame = requestAnimationFrame(drawAll)
  clearTimeout(fallback)
  fallback = setTimeout(() => { if (frame) { cancelAnimationFrame(frame); drawAll() } }, 150)
}
// "Settle on a step": when scrolling stops between two steps of a story, glide to the nearest one.
let idle = 0
let settling = false
function onScroll() {
  schedule()
  clearTimeout(idle)
  if (!settling) idle = setTimeout(settle, 180)
}
function settle() {
  for (const s of scenes) {
    if (!s.near || s.off || !s.conf.snap || s.conf.mode !== 'story') continue
    const p = s.progress()
    if (p <= 0.001 || p >= 0.999) continue
    const n = Math.min(8, Math.max(1, Number(s.conf.steps) || 4))
    const target = (Math.min(n - 1, Math.floor(p * n)) + 0.5) / n
    if (Math.abs(target - p) * s.run < 24) continue
    settling = true
    s.scrollTo(target, true)
    setTimeout(() => { settling = false }, 700)
    return
  }
}
function remeasureAll() {
  for (const s of scenes) s.measure()
  for (const d of depths) d.measure()
  schedule()
}
let resizeTimer = 0
function install() {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener('scroll', onScroll, { passive: true })
  // Only width changes re-measure: an iPhone's address bar changes the height while scrolling.
  let lastW = window.innerWidth
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (window.innerWidth !== lastW || !isPhone()) { lastW = window.innerWidth; remeasureAll() } else schedule()
    }, 120)
  }, { passive: true })
  window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', remeasureAll)
  document.fonts?.ready?.then(remeasureAll)
  window.addEventListener('message', onEditorMessage)
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const item = e.target.__scScene || e.target.__scDepth
        if (!item) continue
        item.near = e.isIntersecting
        item.onNear?.(e.isIntersecting)
      }
      schedule()
    }, { rootMargin: '50% 0px 50% 0px' })
  }
}
function watchNear(el, item) {
  item.near = !io
  if (io) io.observe(el)
}

/* ------------------------------------------------------------------ */
/* A scene                                                              */
/* ------------------------------------------------------------------ */

class Scene {
  constructor(el, conf) {
    this.el = el
    this.conf = conf || {}
    this.near = false
    this.off = true
    this.p = -1
    this.step = 0
    el.__scScene = this
    // Re-measure only when a watched box really changes size (observe() itself reports once: that one is skipped).
    this.sizes = new WeakMap()
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver((entries) => {
      let changed = false
      for (const e of entries) {
        const key = Math.round(e.contentRect.width) + 'x' + Math.round(e.contentRect.height)
        if (this.sizes.has(e.target) && this.sizes.get(e.target) !== key) changed = true
        this.sizes.set(e.target, key)
      }
      if (changed) this.soon()
    }) : null
    this.onFocus = (e) => this.focusInto(e.target)
    el.addEventListener('focusin', this.onFocus)
    // The Store builder changes blocks while the preview is open: find them again.
    if (isEditorMode() && typeof MutationObserver !== 'undefined') {
      this.mo = new MutationObserver(() => this.soon())
      this.mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-sc'] })
    }
    this.measure()
  }

  watch(target) {
    if (!this.ro || this.watched === target) return
    if (this.watched) this.ro.unobserve(this.watched)
    this.ro.observe(target)
    this.watched = target
  }

  soon() {
    if (this.pending && performance.now() - this.pendingAt < 250) return
    if (this.pending) cancelAnimationFrame(this.pending)
    this.pendingAt = performance.now()
    this.pending = requestAnimationFrame(() => { this.pending = 0; this.measure(); schedule() })
  }

  measure() {
    const el = this.el
    const c = this.conf
    this.pin = el.firstElementChild
    this.inner = this.pin?.querySelector(':scope > .sb-inner') || null
    if (!this.pin || !this.inner) return
    const phone = isPhone()
    const off = reduced() || (phone && c.phone === 'off') || (c.mode === 'sideways' && phone && c.phone === 'simple')
    this.reset()
    this.off = off
    el.classList.toggle('sc-off', off)
    // From here the script draws every block; the CSS-only first state (later blocks hidden) stops.
    el.classList.toggle('sc-live', !off)
    if (off) { el.style.removeProperty('--sc-run'); return }
    this.rtl = getComputedStyle(el).direction === 'rtl'
    this.header = headerOffset()
    this.stage = this.pin.offsetHeight || window.innerHeight
    if (c.mode === 'sideways') {
      // The row's own width minus what the screen shows: how far it moves.
      this.travel = Math.max(0, this.inner.scrollWidth - this.pin.clientWidth)
      const fits = this.travel < 8
      el.classList.toggle('sc-fits', fits)
      this.run = fits ? 0 : Math.round(this.travel * (SPEED[c.speed] || 1))
      this.items = [...this.inner.querySelectorAll(':scope > .sb-block[data-sc-speed]')].map((n) => ({ el: n, speed: n.dataset.scSpeed }))
      this.watch(this.inner)
    } else {
      const len = Math.min(8, Math.max(1, Number(c.length) || 3)) * (phone && c.phone === 'simple' ? 0.7 : 1)
      this.run = Math.round(this.stage * len)
      this.items = [...el.querySelectorAll('[data-sc]')].map((n) => ({ el: n, o: parseItem(n.dataset.sc) }))
      for (const it of this.items) if (it.o.c) it.nums = numberNodes(it.el)
      this.dots = [...el.querySelectorAll('.sb-scene-dots > i')]
      this.watch(this.pin)
    }
    el.style.setProperty('--sc-run', `${this.run}px`)
    this.video = c.video ? this.pin.querySelector(':scope > .sb-bg-video video') : null
    if (this.video) { this.video.pause(); this.video.loop = false; this.video.autoplay = false; this.video.removeAttribute('autoplay') }
    this.bg = c.bgm && c.bgm !== 'none' ? c.bgm : ''
    this.p = -1
  }

  reset() {
    if (this.inner) this.inner.style.transform = ''
    for (const it of this.items || []) {
      it.el.style.opacity = ''; it.el.style.transform = ''; it.el.style.filter = ''; it.el.style.clipPath = ''
      it.el.removeAttribute('aria-hidden')
      if (it.nums) for (const n of it.nums) n.node.nodeValue = n.text
    }
    this.pin?.style.removeProperty('--sc-bgt')
    this.pin?.style.removeProperty('--sc-bgf')
    this.items = []
  }

  progress() {
    if (!this.run) return 0
    const top = this.el.getBoundingClientRect().top
    return clamp((this.header - top) / this.run)
  }

  update() {
    if (this.off || !this.inner) return
    const p = this.progress()
    if (Math.abs(p - this.p) < 0.0005) return
    this.p = p
    this.el.style.setProperty('--sc-p', p.toFixed(4))
    if (this.conf.mode === 'sideways') this.drawRow(p)
    else this.drawStory(p)
    if (this.bg) this.drawBg(p)
    if (this.video && this.video.duration && !this.video.seeking) {
      const at = p * (this.video.duration - 0.05)
      if (Math.abs(this.video.currentTime - at) > 0.03) this.video.currentTime = at
    }
  }

  drawRow(p) {
    const dir = this.rtl ? 1 : -1
    const x = dir * p * this.travel
    this.inner.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`
    for (const it of this.items) {
      const extra = it.speed === 'fixed' ? -x : it.speed === 'slower' ? -x * 0.18 : it.speed === 'faster' ? x * 0.18 : 0
      it.el.style.transform = extra ? `translate3d(${extra.toFixed(1)}px,0,0)` : ''
    }
  }

  drawStory(p) {
    const steps = Math.min(8, Math.max(1, Number(this.conf.steps) || 4))
    const step = Math.min(steps, Math.floor(p * steps) + 1)
    if (step !== this.step) {
      this.step = step
      this.dots?.forEach((d, i) => d.classList.toggle('on', i + 1 === step))
    }
    const sign = this.rtl ? -1 : 1
    for (const it of this.items) drawItem(it, p, sign)
  }

  drawBg(p) {
    const s = this.pin.style
    switch (this.bg) {
      case 'zoom_in': s.setProperty('--sc-bgt', `scale(${(1 + 0.25 * p).toFixed(4)})`); break
      case 'zoom_out': s.setProperty('--sc-bgt', `scale(${(1.25 - 0.25 * p).toFixed(4)})`); break
      case 'move_up': s.setProperty('--sc-bgt', `translate3d(0,${(6 - 12 * p).toFixed(2)}%,0) scale(1.15)`); break
      case 'move_down': s.setProperty('--sc-bgt', `translate3d(0,${(-6 + 12 * p).toFixed(2)}%,0) scale(1.15)`); break
      case 'move_side': s.setProperty('--sc-bgt', `translate3d(${((this.rtl ? -1 : 1) * (6 - 12 * p)).toFixed(2)}%,0,0) scale(1.15)`); break
      case 'blur_in': s.setProperty('--sc-bgf', `blur(${(12 * (1 - p)).toFixed(1)}px)`); s.setProperty('--sc-bgt', 'scale(1.06)'); break
      case 'darken': s.setProperty('--sc-bgf', `brightness(${(1 - 0.6 * p).toFixed(3)})`); break
    }
  }

  /** Keyboard: a card in the row that gets focus scrolls the page to where the row shows it. */
  focusInto(target) {
    if (this.off || this.conf.mode !== 'sideways' || !this.travel) return
    const block = target.closest?.('.sb-scene-pin > .sb-inner > .sb-block')
    if (!block) return
    const b = block.getBoundingClientRect()
    const r = this.inner.getBoundingClientRect()
    // Its distance from the row's start edge (the row's own movement cancels out).
    const dist = this.rtl ? r.right - b.right : b.left - r.left
    this.scrollTo(clamp((dist - this.pin.clientWidth * 0.1) / this.travel), false)
  }

  scrollTo(p, smooth) {
    const top = window.scrollY + this.el.getBoundingClientRect().top - this.header + clamp(p) * this.run
    window.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' })
  }

  destroy() {
    this.reset()
    this.ro?.disconnect()
    this.mo?.disconnect()
    io?.unobserve(this.el)
    this.el.removeEventListener('focusin', this.onFocus)
    cancelAnimationFrame(this.pending)
    delete this.el.__scScene
    scenes.delete(this)
  }
}

/* A block in a story: "f,t,i,o,w,e,c,…" packed by SectionTemplate (scItem). */
function parseItem(text) {
  let o = {}
  try { o = JSON.parse(text || '{}') } catch { o = {} }
  const f = clamp((Number(o.f) || 0) / 100)
  const t = clamp((Number.isFinite(Number(o.t)) ? Number(o.t) : 100) / 100)
  return {
    f, t: Math.max(t, f + 0.01),
    i: o.i || 'fade', o: o.o || 'same', w: o.w || 'none', e: EASE[o.e] ? o.e : 'smooth', c: !!o.c,
    mx: Number(o.mx) || 0, my: Number(o.my) || 0, s0: Number(o.s0) || 100, s1: Number(o.s1) || 100, r: Number(o.r) || 0, fo: Number(o.fo) || 0,
  }
}

/** How a block looks while it comes in or goes out: `a` 0 = in place, 1 = fully away. */
function away(kind, a, out, sign, t) {
  switch (kind) {
    case 'rise': t.y += out ? -48 * a : 48 * a; break
    case 'drop': t.y += out ? 48 * a : -48 * a; break
    case 'from_start': case 'to_start': t.x += -80 * a * sign; break
    case 'from_end': case 'to_end': t.x += 80 * a * sign; break
    case 'grow': t.s *= out ? 1 + 0.25 * a : 1 - 0.25 * a; break
    case 'shrink': t.s *= out ? 1 - 0.25 * a : 1 + 0.25 * a; break
    case 'blur': t.b += 12 * a; break
    case 'turn': t.r += (out ? 12 : -12) * a; break
    case 'flip': t.rx += 70 * a; break
    case 'wipe_up': t.clip = `inset(${(100 * a).toFixed(1)}% 0 0 0)`; t.noFade = true; break
    case 'wipe_side': t.clip = sign > 0 ? `inset(0 ${(100 * a).toFixed(1)}% 0 0)` : `inset(0 0 0 ${(100 * a).toFixed(1)}%)`; t.noFade = true; break
  }
}
const OUT_AS_IN = { from_start: 'to_start', from_end: 'to_end' }

function drawItem(it, p, sign) {
  const o = it.o
  const el = it.el
  const span = o.t - o.f
  const d = Math.min(0.08, span / 3)
  let k = 1
  let phase = ''
  if (o.f > 0 && p < o.f) { k = 0; phase = 'in' } else if (o.f > 0 && p < o.f + d) { k = (p - o.f) / d; phase = 'in' } else if (o.t < 1 && p >= o.t) { k = 0; phase = 'out' } else if (o.t < 1 && p > o.t - d) { k = (o.t - p) / d; phase = 'out' }
  const e = EASE[o.e](clamp(k))
  const t = { x: 0, y: 0, s: 1, r: 0, rx: 0, b: 0, clip: '', noFade: false }
  let opacity = 1
  if (phase) {
    let kind = phase === 'in' ? o.i : (o.o === 'same' ? (OUT_AS_IN[o.i] || o.i) : o.o)
    if (kind === 'none') opacity = k > 0 ? 1 : 0
    else {
      away(kind, 1 - e, phase === 'out', sign, t)
      opacity = t.noFade ? (k > 0 ? 1 : 0) : e
    }
  }
  // While shown: from its start to its end.
  const q = EASE.smooth(clamp((p - o.f) / span))
  switch (o.w) {
    case 'drift_up': t.y += -50 * q; break
    case 'drift_down': t.y += 50 * q; break
    case 'drift_side': t.x += 50 * q * sign; break
    case 'grow': t.s *= 1 + 0.12 * q; break
    case 'shrink': t.s *= 1 - 0.1 * q; break
    case 'zoom_out': t.s *= 2.2 + (1 - 2.2) * q; break
    case 'turn': t.r += 12 * q; break
    case 'custom':
      t.x += o.mx * q * sign; t.y += o.my * q
      t.s *= (o.s0 + (o.s1 - o.s0) * q) / 100
      t.r += o.r * q
      opacity *= 1 - (o.fo / 100) * q
      break
  }
  el.style.opacity = opacity >= 0.999 ? '' : opacity.toFixed(3)
  const moved = t.x || t.y || t.s !== 1 || t.r || t.rx
  el.style.transform = moved ? `translate3d(${t.x.toFixed(1)}px,${t.y.toFixed(1)}px,0)${t.rx ? ` perspective(800px) rotateX(${t.rx.toFixed(1)}deg)` : ''} scale(${t.s.toFixed(4)}) rotate(${t.r.toFixed(2)}deg)` : ''
  el.style.filter = t.b ? `blur(${t.b.toFixed(1)}px)` : ''
  el.style.clipPath = t.clip
  // Texts that aren't on screen are only faded: still in the page for Google and screen readers' reading order.
  const hidden = opacity < 0.05 || (t.clip && k <= 0)
  if (hidden !== it.hidden) { it.hidden = hidden; if (hidden) el.setAttribute('aria-hidden', 'true'); else el.removeAttribute('aria-hidden') }
  if (it.nums) {
    const c = clamp((p - o.f) / Math.max(0.02, span * 0.4))
    for (const n of it.nums) n.node.nodeValue = n.fill(c)
  }
}

/** "Count numbers up": the text nodes of a block that hold numbers, with a way to write them at a fraction. */
function numberNodes(root) {
  const out = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const re = /\d[\d,.\u00a0]*/g
  for (let node = walker.nextNode(); node && out.length < 12; node = walker.nextNode()) {
    const text = node.nodeValue
    if (!/\d/.test(text)) continue
    const parts = []
    let last = 0
    for (const m of text.matchAll(re)) {
      const raw = m[0].replace(/[.,\u00a0]+$/, '')
      const decimals = (raw.match(/[.,](\d{1,2})$/) || [])[1]?.length || 0
      const value = parseFloat(decimals ? raw.replace(/[,\u00a0](?=\d{3})/g, '').replace(',', '.') : raw.replace(/[^\d]/g, ''))
      parts.push(text.slice(last, m.index), { value, decimals, sep: /\d[,\u00a0]\d{3}/.test(raw) ? raw.match(/\d([,\u00a0])\d{3}/)[1] : '' })
      last = m.index + raw.length
    }
    parts.push(text.slice(last))
    out.push({
      node, text,
      fill: (k) => parts.map((x) => {
        if (typeof x === 'string') return x
        const v = x.value * k
        let s = x.decimals ? v.toFixed(x.decimals) : String(Math.round(v))
        if (x.sep) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, x.sep)
        return s
      }).join(''),
    })
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Depth While Scrolling (any section's background)                     */
/* ------------------------------------------------------------------ */

class Depth {
  constructor(el, level) {
    this.el = el
    this.level = level
    el.__scDepth = this
    this.measure()
  }
  measure() { this.amount = reduced() ? 0 : (this.level === 'strong' && !isPhone() ? 0.18 : 0.08) }
  update() {
    if (!this.amount) { this.el.style.removeProperty('--sc-bgy'); return }
    const r = this.el.getBoundingClientRect()
    const vh = window.innerHeight
    const t = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2), -1, 1)
    this.el.style.setProperty('--sc-bgy', `${(t * this.amount * 100).toFixed(2)}%`)
  }
  destroy() {
    io?.unobserve(this.el)
    this.el.style.removeProperty('--sc-bgy')
    delete this.el.__scDepth
    depths.delete(this)
  }
}

/* ------------------------------------------------------------------ */
/* The Store builder's "Preview at" (a story's strip)                   */
/* ------------------------------------------------------------------ */

function onEditorMessage(e) {
  if (!isEditorMessage(e) || e.data?.type !== 'scene_preview') return
  const id = String(e.data.id || '')
  for (const s of scenes) {
    if (s.el.dataset.sceneId !== id) continue
    if (s.off) { s.el.scrollIntoView({ block: 'start' }); return }
    s.scrollTo(Number(e.data.progress) || 0, false)
    schedule()
    return
  }
}

/* ------------------------------------------------------------------ */
/* Directives                                                           */
/* ------------------------------------------------------------------ */

export const vScene = {
  mounted(el, binding) {
    install()
    const s = new Scene(el, binding.value)
    scenes.add(s)
    watchNear(el, s)
    schedule()
  },
  updated(el, binding) {
    const s = el.__scScene
    if (!s) return
    const next = JSON.stringify(binding.value || {})
    if (next !== s.confText) { s.confText = next; s.conf = binding.value || {} }
    s.soon()
  },
  unmounted(el) { el.__scScene?.destroy() },
}

export const vBgDepth = {
  mounted(el, binding) {
    if (!binding.value) return
    install()
    const d = new Depth(el, binding.value)
    depths.add(d)
    watchNear(el, d)
    schedule()
  },
  updated(el, binding) {
    const d = el.__scDepth
    if (d && !binding.value) d.destroy()
    else if (d) { d.level = binding.value; d.measure(); schedule() } else if (binding.value) vBgDepth.mounted(el, binding)
  },
  unmounted(el) { el.__scDepth?.destroy() },
}

/* ------------------------------------------------------------------ */
/* Tilt toward the mouse (Hover Effect: tilt), computers only           */
/* ------------------------------------------------------------------ */

let tiltOn = false
export function installTilt() {
  if (tiltOn || typeof window === 'undefined') return
  tiltOn = true
  if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return
  let current = null
  let next = null
  let raf = 0
  const draw = () => {
    raf = 0
    if (!next) return
    const { el, x, y } = next
    el.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg)`
  }
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || reduced()) return
    const el = e.target.closest?.('.sb-hover-tilt')
    if (el !== current) {
      if (current) { current.style.transform = ''; current.classList.remove('sc-tilting') }
      current = el
      if (el) el.classList.add('sc-tilting')
    }
    if (!el) { next = null; return }
    const r = el.getBoundingClientRect()
    next = { el, x: clamp((e.clientX - r.left) / r.width) - 0.5, y: clamp((e.clientY - r.top) / r.height) - 0.5 }
    if (!raf) raf = requestAnimationFrame(draw)
  }, { passive: true })
  document.addEventListener('pointerleave', () => { if (current) { current.style.transform = ''; current.classList.remove('sc-tilting'); current = null } }, true)
}
