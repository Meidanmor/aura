/**
 * The visitor's accessibility choices (the accessibility tool, A11yButton.vue / A11yPanel.vue).
 *
 * Saved in localStorage `qwoo_a11y` on this device only, and put on <html> as classes
 * (`a11y-s2 a11y-cd a11y-st` …) by a small script in the page head before the first paint
 * (render.js: A11Y_HEAD_SCRIPT), so a returning visitor never sees the page flash and Vue's
 * hydration is untouched (nothing inside #q-app changes). The looks are in src/css/a11y-tool.css.
 *
 * "Stop animations" also answers yes to every `(prefers-reduced-motion: reduce)` check the
 * storefront makes (scroll scenes, carousels, entrances…): the head script wraps matchMedia.
 */

export const STORE_KEY = 'qwoo_a11y'

/** { size 0-3, contrast '' | 'light' | 'dark', and the switches } */
export const SWITCHES = ['spacing', 'font', 'align', 'gray', 'links', 'headings', 'motion', 'cursor', 'guide', 'mask']
const CLASS = { spacing: 'sp', font: 'rf', align: 'al', gray: 'gr', links: 'ln', headings: 'hd', motion: 'st', cursor: 'cu' }

export function emptyPrefs() {
  return { size: 0, contrast: '' }
}

export function readPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(STORE_KEY) || 'null')
    return p && typeof p === 'object' ? { ...emptyPrefs(), ...p } : emptyPrefs()
  } catch {
    return emptyPrefs()
  }
}

/** The <html> classes for these choices. */
export function classesOf(p) {
  const out = []
  if (p.size > 0) out.push(`a11y-s${Math.min(3, p.size | 0)}`)
  if (p.contrast === 'light') out.push('a11y-cl')
  if (p.contrast === 'dark') out.push('a11y-cd')
  for (const k of Object.keys(CLASS)) if (p[k]) out.push(`a11y-${CLASS[k]}`)
  return out
}

/** Saves and applies at once (classes on <html>; reduced-motion checks hear the change). */
export function applyPrefs(p) {
  try {
    const empty = !classesOf(p).length && !p.guide && !p.mask
    if (empty) localStorage.removeItem(STORE_KEY)
    else localStorage.setItem(STORE_KEY, JSON.stringify(p))
  } catch { /* private window: this page only */ }
  const html = document.documentElement
  const before = html.classList.contains('a11y-st')
  for (const c of [...html.classList]) if (/^a11y-/.test(c)) html.classList.remove(c)
  for (const c of classesOf(p)) html.classList.add(c)
  if (before !== !!p.motion) {
    // The wrapped matchMedia (head script) tells every reduced-motion listener.
    try { window.__qwooA11yMotion?.() } catch { /* nothing listens */ }
    // Playing videos (background videos, Video blocks) stop / may play again.
    for (const v of document.querySelectorAll('video')) {
      if (p.motion && !v.paused) { v.dataset.a11yPaused = '1'; v.pause() }
      else if (!p.motion && v.dataset.a11yPaused) { delete v.dataset.a11yPaused; v.play?.().catch(() => {}) }
    }
  }
}

/**
 * The head script (a string, run before the app): the classes from the saved choices, and the
 * reduced-motion wrapper. Kept tiny and ES5 (old browsers must never throw here).
 */
export const A11Y_HEAD_SCRIPT = `(function(){try{var d=document.documentElement,p=JSON.parse(localStorage.getItem('${STORE_KEY}')||'null')||{},m={spacing:'sp',font:'rf',align:'al',gray:'gr',links:'ln',headings:'hd',motion:'st',cursor:'cu'},k;if(p.size>0)d.classList.add('a11y-s'+Math.min(3,p.size|0));if(p.contrast==='light')d.classList.add('a11y-cl');if(p.contrast==='dark')d.classList.add('a11y-cd');for(k in m)if(p[k])d.classList.add('a11y-'+m[k]);var mm=window.matchMedia;if(!mm)return;var subs=[];window.matchMedia=function(q){var r=mm.call(window,q);if(!/prefers-reduced-motion:\\s*reduce/.test(q))return r;var o={media:r.media,onchange:null,addEventListener:function(t,f){subs.push(f);try{r.addEventListener(t,f)}catch(e){}},removeEventListener:function(t,f){subs=subs.filter(function(x){return x!==f});try{r.removeEventListener(t,f)}catch(e){}},addListener:function(f){o.addEventListener('change',f)},removeListener:function(f){o.removeEventListener('change',f)},dispatchEvent:function(){return true}};Object.defineProperty(o,'matches',{get:function(){return d.classList.contains('a11y-st')||r.matches}});return o};window.__qwooA11yMotion=function(){var e={matches:d.classList.contains('a11y-st'),media:'(prefers-reduced-motion: reduce)'};subs.slice().forEach(function(f){try{f(e)}catch(x){}})}}catch(e){}})()`
