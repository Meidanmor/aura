import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { youtubeId, vimeoId, youtubeThumbnail, backgroundEmbedUrl } from 'src/utils/video-embed.js'
import { currentLang } from 'src/i18n/lang.js'
import { LANGUAGES } from 'src/i18n/index.js'

/**
 * Turns Shop Builder (schema v3) style objects into CSS classes + custom
 * properties. The plugin always publishes responsive values fully resolved
 * — `{ desktop, tablet, mobile }` with inheritance already applied — so
 * each one maps straight onto three variables:
 *
 *   --name      desktop  (>= 1024px)
 *   --name-t    tablet   (768px – 1023px)
 *   --name-m    mobile   (<= 767px)
 *
 * and the rules in src/css/app.css (".sb-*") pick the right one per
 * breakpoint. Every container/block resets its own variables in CSS, so a
 * nested section never accidentally inherits its parent's values.
 */

export const DEVICES = ['desktop', 'tablet', 'mobile']
const SUFFIX = { desktop: '', tablet: '-t', mobile: '-m' }
const DEVICE_SHORT = { desktop: 'd', tablet: 't', mobile: 'm' }

const PADDING_PRESETS = new Set(['none', 'small', 'medium', 'large', 'custom'])
const WIDTH_MODES = new Set(['full', 'contained', 'custom'])

/** Accepts "40", "40px", "2rem", "auto"… bare numbers get "px". */
export function toCssLength(v) {
  if (v === '' || v == null) return null
  const s = String(v).trim()
  return /^-?\d+(\.\d+)?$/.test(s) ? `${s}px` : s
}

/** Normalizes a value that may (legacy) be a plain scalar into { desktop, tablet, mobile }. */
export function asResponsive(value) {
  if (value && typeof value === 'object' && !Array.isArray(value) && ('desktop' in value || 'tablet' in value || 'mobile' in value)) {
    const d = value.desktop ?? ''
    const t = value.tablet === '' || value.tablet == null ? d : value.tablet
    const m = value.mobile === '' || value.mobile == null ? t : value.mobile
    return { desktop: d, tablet: t, mobile: m }
  }
  return { desktop: value, tablet: value, mobile: value }
}

/**
 * Looks that can differ per screen size (store fields with `screens`: colours,
 * corner radius, shadow, overlay…) are published as the desktop value, plus
 * `_screens[key] = { tablet, mobile }` only when another screen size differs,
 * so older storefronts keep reading the desktop value. styleAt() gives the
 * style as one screen size sees it.
 */
export function styleAt(style, device) {
  const extra = style?._screens
  if (!extra || typeof extra !== 'object' || device === 'desktop') return style || {}
  const out = { ...style }
  for (const [key, v] of Object.entries(extra)) {
    if (v && typeof v === 'object' && device in v) out[key] = v[device]
  }
  return out
}

/** One look per screen size: fn(style as that screen size sees it) for each. */
const perScreen = (style, fn) => Object.fromEntries(DEVICES.map((d) => [d, fn(styleAt(style, d))]))

/**
 * Writes --name for desktop, and --name-t / --name-m only where they differ
 * (the CSS falls back to the bigger screen's). `empty`: the CSS value for
 * "nothing" on a screen size where a bigger one has something.
 */
function setLookVars(vars, name, r, empty) {
  if (r.desktop) vars[name] = r.desktop
  if (r.tablet !== r.desktop) vars[`${name}-t`] = r.tablet || empty
  if (r.mobile !== r.tablet) vars[`${name}-m`] = r.mobile || empty
  return DEVICES.some((d) => !!r[d])
}

/** Writes --name / --name-t / --name-m for a responsive value. */
export function setResponsiveVar(vars, name, value, transform = (x) => x) {
  const r = asResponsive(value)
  for (const device of DEVICES) {
    const v = transform(r[device])
    if (v !== null && v !== undefined && v !== '') vars[`${name}${SUFFIX[device]}`] = String(v)
  }
}

function hasAny(value) {
  const r = asResponsive(value)
  return DEVICES.some((d) => r[d] !== '' && r[d] != null)
}

/** hide-on-device classes shared by containers and blocks. */
export function visibilityClasses(hideOn) {
  const h = hideOn || {}
  return {
    'sb-hide-d': !!h.desktop,
    'sb-hide-t': !!h.tablet,
    'sb-hide-m': !!h.mobile,
  }
}

/** Whether the page being rendered reads right to left. */
export const isRtlPage = () => LANGUAGES[currentLang()]?.dir === 'rtl'

/**
 * Alignment → a flex value. "default" is the start of the line in the
 * page's language (flex-start flips by itself in RTL); left and right are
 * always that side, so they swap ends on right-to-left pages.
 */
export function alignToFlex(v) {
  if (v === 'default') return 'flex-start'
  if (v === 'center' || v === 'stretch') return v
  if (v === 'left') return isRtlPage() ? 'flex-end' : 'flex-start'
  if (v === 'right') return isRtlPage() ? 'flex-start' : 'flex-end'
  return null
}

/** Alignment → text-align ("default": the start of the line in the page's language). */
export const alignToText = (v) => (v === 'default' ? 'start' : ['left', 'center', 'right'].includes(v) ? v : null)

/**
 * A background image: { url, width, height } for desktop (all screens in
 * older data), plus `tablet` and `mobile` images when they differ (already
 * filled in by the store).
 */
export function bgImageUrls(img) {
  const d = (typeof img === 'string' ? img : img?.url) || ''
  const t = img?.tablet?.url || d
  const m = img?.mobile?.url || t
  return { desktop: d, tablet: t, mobile: m }
}

/* ------------------------------------------------------------------ */
/* Backgrounds & padding (shared by containers and blocks)             */
/* ------------------------------------------------------------------ */

const cssUrl = (url) => `url("${String(url).replace(/"/g, '%22')}")`

/** Writes --sb-pt/-pr/-pb/-pl (+ -t / -m) for a responsive `sides` value. */
function setSidesVars(vars, value) {
  const r = asResponsive(value)
  let any = false
  for (const device of DEVICES) {
    const sides = r[device] || {}
    for (const [side, key] of [['top', 'pt'], ['right', 'pr'], ['bottom', 'pb'], ['left', 'pl']]) {
      const len = toCssLength(sides[side])
      if (len) {
        vars[`--sb-${key}${SUFFIX[device]}`] = len
        any = true
      }
    }
  }
  return any
}

/**
 * Background of a container or block (BACKGROUND_FIELDS in the plugin).
 * Returns CSS vars + classes for the element, and `video` ({ src, poster,
 * mobile }) when a video background should be rendered (SectionBgVideo).
 * A video's poster doubles as the CSS background image, so it shows while
 * the video loads and wherever the video isn't played.
 */
/**
 * The background position per screen size: a preset ("center top"), or
 * "Custom" with its own horizontal / vertical values (50% when left empty).
 */
function bgPosition(s) {
  const pos = asResponsive(s.bg_image_position)
  const x = asResponsive(s.bg_pos_x)
  const y = asResponsive(s.bg_pos_y)
  const out = {}
  for (const d of DEVICES) {
    out[d] = pos[d] === 'custom' ? `${toCssLength(x[d]) || '50%'} ${toCssLength(y[d]) || '50%'}` : pos[d]
  }
  return out
}

export function buildBackground(style = {}) {
  const s = style || {}
  const vars = {}
  const bgType = s.bg_type || 'none'
  let video = null
  let slideshow = null
  let tags = null
  let hasImage = false

  if (bgType === 'color') {
    setLookVars(vars, '--sb-bg', perScreen(s, (x) => resolveGlobalColor(x.bg_color) || ''), 'transparent')
  } else if (bgType === 'gradient') {
    setLookVars(vars, '--sb-bg-img', perScreen(s, (x) => {
      const c1 = resolveGlobalColor(x.bg_gradient_color1) || 'transparent'
      const c2 = resolveGlobalColor(x.bg_gradient_color2) || 'transparent'
      const angle = Number.isFinite(Number(x.bg_gradient_angle)) ? Number(x.bg_gradient_angle) : 180
      return `linear-gradient(${angle}deg, ${c1}, ${c2})`
    }), 'none')
  } else if (bgType === 'image' && Object.values(bgImageUrls(s.bg_image)).some(Boolean)) {
    hasImage = true
    // Product tags on the background image (ProductTags.vue, drawn over the section).
    if (Array.isArray(s.bg_tags) && s.bg_tags.length && s.bg_image && typeof s.bg_image === 'object') {
      tags = { tags: s.bg_tags, image: s.bg_image, mobileImage: s.bg_image.mobile || null, fit: asResponsive(s.bg_image_size || 'cover'), position: bgPosition(s) }
    }
    // Only the image of the screen size in use is downloaded (CSS picks it).
    setResponsiveVar(vars, '--sb-bg-img', bgImageUrls(s.bg_image), (u) => (u ? cssUrl(u) : 'none'))
    setResponsiveVar(vars, '--sb-bg-size', s.bg_image_size)
    setResponsiveVar(vars, '--sb-bg-pos', bgPosition(s))
  } else if (bgType === 'slideshow') {
    // Images that change by themselves (SectionBgSlides.vue draws them as <img> layers).
    const slides = (Array.isArray(s.bg_slides) ? s.bg_slides : [])
      .map((x) => ({
        url: slideUrl(x?.image),
        mobile: slideUrl(x?.mobile_image),
        // For product tags: the images' sizes, and the tags themselves.
        image: typeof x?.image === 'object' ? x.image : null,
        mobileImage: typeof x?.mobile_image === 'object' ? x.mobile_image : null,
        tags: Array.isArray(x?.tags) ? x.tags : [],
      }))
      .filter((x) => x.url)
    if (slides.length) {
      const sec = Number(s.bg_slide_seconds)
      slideshow = {
        slides,
        seconds: Number.isFinite(sec) ? Math.min(30, Math.max(2, sec)) : 6,
        zoom: s.bg_slide_effect !== 'fade',
        counter: !!s.bg_slide_counter,
        arrows: !!s.bg_slide_arrows,
        position: bgPosition(s),
      }
      setResponsiveVar(vars, '--sb-bg-pos', bgPosition(s))
      vars['--sb-slide-s'] = `${slideshow.seconds}s`
    }
  } else if (bgType === 'video') {
    // Upload (a <video> file) or a YouTube / Vimeo embed.
    const kind = s.bg_video_source === 'youtube' || s.bg_video_source === 'vimeo' ? s.bg_video_source : 'file'
    let src = ''
    let embedId = ''
    if (kind === 'file') src = s.bg_video?.url || ''
    else {
      embedId = kind === 'youtube' ? youtubeId(s.bg_video_link) : vimeoId(s.bg_video_link)
      src = backgroundEmbedUrl(kind, embedId)
    }
    // Poster (also the CSS background): the chosen image, else YouTube's thumbnail.
    const poster = s.bg_video_poster?.url || (kind === 'youtube' ? youtubeThumbnail(embedId) : '')
    if (poster) {
      hasImage = true
      vars['--sb-bg-img'] = cssUrl(poster)
    }
    if (src || poster) setResponsiveVar(vars, '--sb-bg-pos', bgPosition(s))
    if (src) video = { kind, src, poster, mobile: !s.bg_video_mobile_poster }
  }

  // Overlay: a screen size without a colour shows none (opacity 0).
  const overlayColor = perScreen(s, (x) => resolveGlobalColor(x.bg_overlay_color) || '')
  const hasOverlay = (bgType === 'image' || bgType === 'video' || !!slideshow) && DEVICES.some((d) => !!overlayColor[d])
  if (hasOverlay) {
    setLookVars(vars, '--sb-overlay', overlayColor, 'transparent')
    const opacity = perScreen(s, (x) => {
      const o = Number(x.bg_overlay_opacity)
      return String(Number.isFinite(o) ? Math.min(100, Math.max(0, o)) / 100 : 0.5)
    })
    for (const d of DEVICES) if (!overlayColor[d]) opacity[d] = '0'
    setLookVars(vars, '--sb-overlay-o', opacity, '0')
  }

  return {
    vars,
    classes: {
      'sb-has-bg-img': hasImage,
      'sb-bg-fixed': bgType === 'image' && hasImage && !!s.bg_fixed,
      'sb-has-overlay': hasOverlay,
      'sb-has-bg-video': !!video,
      'sb-has-bg-slides': !!slideshow,
    },
    video,
    slideshow,
    tags,
    hasOverlay,
    // Anything painted at all (decides whether a block gets the box styles)
    painted: Object.keys(vars).length > 0 || !!video || !!slideshow,
  }
}

const slideUrl = (img) => (typeof img === 'string' ? img : img?.url) || ''

/** Shadow, corner radius (and a container's text colour) per screen size, as CSS vars. Returns which are used. */
function setBoxLooks(vars, s, radiusKey, colorKey) {
  const has = {}
  has.shadow = setLookVars(vars, '--sb-shadow', perScreen(s, (x) => buildShadow(x) || ''), 'none')
  if (has.shadow && !vars['--sb-shadow']) vars['--sb-shadow'] = 'none'
  has.radius = setLookVars(vars, '--sb-radius', perScreen(s, (x) => toCssLength(x[radiusKey]) || ''), '0')
  if (colorKey) has.color = setLookVars(vars, '--sb-color', perScreen(s, (x) => resolveGlobalColor(x[colorKey]) || ''), 'inherit')
  return has
}

/**
 * Box shadow (SHADOW_FIELDS in the plugin): "x y blur spread color", with
 * "inset" in front when it sits inside the box. Null when it's off.
 */
export function buildShadow(style = {}) {
  const s = style || {}
  if (!s.shadow) return null
  const len = (v, fallback) => toCssLength(v) || fallback
  const color = resolveGlobalColor(s.shadow_color) || 'rgba(0, 0, 0, 0.12)'
  const parts = [len(s.shadow_x, '0px'), len(s.shadow_y, '8px'), len(s.shadow_blur, '24px'), len(s.shadow_spread, '0px'), color]
  // Lengths come from the store's sanitizer; keep anything odd out of the CSS anyway.
  if (parts.slice(0, 4).some((p) => !/^-?\d+(\.\d+)?(px|rem|em|%)?$/.test(p))) return null
  return `${s.shadow_inset ? 'inset ' : ''}${parts.join(' ')}`
}

/* ------------------------------------------------------------------ */
/* Containers (top-level sections and nested `section` blocks)         */
/* ------------------------------------------------------------------ */

/**
 * Styles for a container element (background, padding, min-height, text
 * color, radius) and its inner flex box (width, direction, gap, alignment).
 */
export function buildContainerStyle(style = {}) {
  const s = style || {}
  const outerVars = {}
  const innerVars = {}

  // Padding
  const preset = PADDING_PRESETS.has(s.padding_preset) ? s.padding_preset : 'none'
  if (preset === 'custom') setSidesVars(outerVars, s.padding)

  // Min height
  setResponsiveVar(outerVars, '--sb-minh', s.min_height, toCssLength)

  // Background
  const bg = buildBackground(s)
  Object.assign(outerVars, bg.vars)

  // Text color, radius and shadow (each may differ per screen size)
  const looks = setBoxLooks(outerVars, s, 'border_radius', 'text_color')
  const radius = looks.radius
  const shadow = looks.shadow

  // Margins (applied by whoever renders the container's outermost box)
  const marginVars = {}
  setResponsiveVar(marginVars, '--sbb-mt', s.margin_top, toCssLength)
  setResponsiveVar(marginVars, '--sbb-mb', s.margin_bottom, toCssLength)

  // Inner flex layout
  setResponsiveVar(innerVars, '--sb-dir', s.direction)
  setResponsiveVar(innerVars, '--sb-wrap', s.wrap)
  setResponsiveVar(innerVars, '--sb-jc', s.justify)
  setResponsiveVar(innerVars, '--sb-ai', s.align_items)
  if (s.align_content) innerVars['--sb-ac'] = s.align_content
  setResponsiveVar(innerVars, '--sb-gap', s.gap, toCssLength)

  const dir = asResponsive(s.direction || 'column')
  const rowClasses = {}
  for (const device of DEVICES) {
    rowClasses[`sb-row-${DEVICE_SHORT[device]}`] = String(dir[device] || '').startsWith('row')
  }

  const widthMode = WIDTH_MODES.has(s.width_mode) ? s.width_mode : 'contained'
  const widthVars = {}
  if (widthMode === 'custom') setResponsiveVar(widthVars, '--sbb-w', s.width, toCssLength)

  const hover = HOVER_EFFECTS.has(s.hover_effect) ? s.hover_effect : ''
  const link = sectionLink(s)

  return {
    outerClasses: {
      [`sb-pad-${preset}`]: true,
      ...bg.classes,
      'sb-has-radius': !!radius,
      'sb-has-shadow': !!shadow,
      ...(hover ? { [`sb-hover-${hover}`]: true } : {}),
      'sb-has-link': !!link,
      ...visibilityClasses(s.hide_on),
    },
    outerVars,
    innerClasses: rowClasses,
    innerVars,
    marginVars,
    widthMode,
    widthVars,
    hasOverlay: bg.hasOverlay,
    video: bg.video,
    slideshow: bg.slideshow,
    tags: bg.tags,
    anchorId: s.anchor_id || undefined,
    link,
  }
}

const HOVER_EFFECTS = new Set(['zoom', 'darken', 'lift'])

/**
 * "Make the whole section a link": { internal, to | href, newTab, label },
 * or null. Only site paths and http(s) / mailto / tel addresses.
 */
export function sectionLink(s = {}) {
  const url = typeof s.link_url === 'string' ? s.link_url.trim() : ''
  if (!url) return null
  const internal = url.startsWith('/') && !url.startsWith('//')
  if (!internal && !/^(https?:|mailto:|tel:)/i.test(url)) return null
  return { internal, url, newTab: !!s.link_new_tab, label: typeof s.link_label === 'string' ? s.link_label.trim() : '' }
}

/* ------------------------------------------------------------------ */
/* Block wrappers (.sb-block around every block inside a container)    */
/* ------------------------------------------------------------------ */

export function buildBlockWrapperStyle(block) {
  if (block?.type === 'section') {
    // A nested section's own style drives its wrapper: margins, width
    // (custom → fixed width, contained → 1200px max), visibility, anchor.
    const c = buildContainerStyle(block.style)
    const vars = { ...c.marginVars, ...c.widthVars }
    if (c.widthMode === 'contained') vars['--sbb-maxw'] = '1200px'
    return {
      classes: {
        'sb-block--section': true,
        'sb-has-w': c.widthMode === 'custom' && hasAny(block.style?.width),
        'sb-has-maxw': c.widthMode === 'contained',
        ...visibilityClasses(block.style?.hide_on),
      },
      vars,
      anchorId: block.style?.anchor_id || undefined,
    }
  }

  const s = block?.style || {}
  const vars = {}
  setResponsiveVar(vars, '--sbb-mt', s.margin_top, toCssLength)
  setResponsiveVar(vars, '--sbb-mb', s.margin_bottom, toCssLength)
  setResponsiveVar(vars, '--sbb-w', s.width, toCssLength)
  setResponsiveVar(vars, '--sbb-maxw', s.max_width, toCssLength)

  // Box: inner padding, corner radius and background (Style tab).
  const hasPadding = setSidesVars(vars, s.box_padding)
  const looks = setBoxLooks(vars, s, 'box_radius')
  const radius = looks.radius
  const shadow = looks.shadow
  const bg = buildBackground(s)
  Object.assign(vars, bg.vars)
  // Entrance animation's delay (the animation itself: src/utils/entrance.js).
  const delay = Number(s.animation_delay)
  if (s.animation && s.animation !== 'none' && delay > 0) vars['--sb-anim-delay'] = `${Math.min(1500, delay)}ms`

  return {
    classes: {
      [`sb-block--${block?.type}`]: true,
      'sb-has-w': hasAny(s.width),
      'sb-has-maxw': hasAny(s.max_width),
      'sb-has-box': hasPadding || !!radius || !!shadow || bg.painted,
      'sb-has-radius': !!radius,
      'sb-has-shadow': !!shadow,
      ...bg.classes,
      ...visibilityClasses(s.hide_on),
    },
    vars,
    video: bg.video,
    slideshow: bg.slideshow,
    tags: bg.tags,
    anchorId: s.anchor_id || undefined,
  }
}
