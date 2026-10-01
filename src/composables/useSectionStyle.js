import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'
import { youtubeId, vimeoId, youtubeThumbnail, backgroundEmbedUrl } from 'src/utils/video-embed.js'

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

const ALIGN_TO_FLEX = { left: 'flex-start', center: 'center', right: 'flex-end', stretch: 'stretch' }
export const alignToFlex = (v) => ALIGN_TO_FLEX[v] || null

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
export function buildBackground(style = {}) {
  const s = style || {}
  const vars = {}
  const bgType = s.bg_type || 'none'
  let video = null
  let hasImage = false

  if (bgType === 'color') {
    const c = resolveGlobalColor(s.bg_color)
    if (c) vars['--sb-bg'] = c
  } else if (bgType === 'gradient') {
    const c1 = resolveGlobalColor(s.bg_gradient_color1) || 'transparent'
    const c2 = resolveGlobalColor(s.bg_gradient_color2) || 'transparent'
    const angle = Number.isFinite(Number(s.bg_gradient_angle)) ? Number(s.bg_gradient_angle) : 180
    vars['--sb-bg-img'] = `linear-gradient(${angle}deg, ${c1}, ${c2})`
  } else if (bgType === 'image' && s.bg_image?.url) {
    hasImage = true
    vars['--sb-bg-img'] = cssUrl(s.bg_image.url)
    setResponsiveVar(vars, '--sb-bg-size', s.bg_image_size)
    setResponsiveVar(vars, '--sb-bg-pos', s.bg_image_position)
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
    if (src || poster) setResponsiveVar(vars, '--sb-bg-pos', s.bg_image_position)
    if (src) video = { kind, src, poster, mobile: !s.bg_video_mobile_poster }
  }

  const hasOverlay = (bgType === 'image' || bgType === 'video') && !!s.bg_overlay_color
  if (hasOverlay) {
    vars['--sb-overlay'] = resolveGlobalColor(s.bg_overlay_color)
    const o = Number(s.bg_overlay_opacity)
    vars['--sb-overlay-o'] = String(Number.isFinite(o) ? Math.min(100, Math.max(0, o)) / 100 : 0.5)
  }

  return {
    vars,
    classes: {
      'sb-has-bg-img': hasImage,
      'sb-bg-fixed': bgType === 'image' && hasImage && !!s.bg_fixed,
      'sb-has-overlay': hasOverlay,
      'sb-has-bg-video': !!video,
    },
    video,
    hasOverlay,
    // Anything painted at all (decides whether a block gets the box styles)
    painted: Object.keys(vars).length > 0 || !!video,
  }
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

  // Text color & radius
  const color = resolveGlobalColor(s.text_color)
  if (color) outerVars['--sb-color'] = color
  const radius = toCssLength(s.border_radius)
  if (radius) outerVars['--sb-radius'] = radius

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

  return {
    outerClasses: {
      [`sb-pad-${preset}`]: true,
      ...bg.classes,
      'sb-has-radius': !!radius,
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
    anchorId: s.anchor_id || undefined,
  }
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
  const radius = toCssLength(s.box_radius)
  if (radius) vars['--sb-radius'] = radius
  const bg = buildBackground(s)
  Object.assign(vars, bg.vars)

  return {
    classes: {
      [`sb-block--${block?.type}`]: true,
      'sb-has-w': hasAny(s.width),
      'sb-has-maxw': hasAny(s.max_width),
      'sb-has-box': hasPadding || !!radius || bg.painted,
      'sb-has-radius': !!radius,
      ...bg.classes,
      ...visibilityClasses(s.hide_on),
    },
    vars,
    video: bg.video,
    anchorId: s.anchor_id || undefined,
  }
}
