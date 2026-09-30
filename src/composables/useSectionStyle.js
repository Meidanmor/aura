import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'

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
  if (preset === 'custom') {
    const r = asResponsive(s.padding)
    for (const device of DEVICES) {
      const sides = r[device] || {}
      for (const [side, key] of [['top', 'pt'], ['right', 'pr'], ['bottom', 'pb'], ['left', 'pl']]) {
        const len = toCssLength(sides[side])
        if (len) outerVars[`--sb-${key}${SUFFIX[device]}`] = len
      }
    }
  }

  // Min height
  setResponsiveVar(outerVars, '--sb-minh', s.min_height, toCssLength)

  // Background
  const bgType = s.bg_type || 'none'
  if (bgType === 'color') {
    const c = resolveGlobalColor(s.bg_color)
    if (c) outerVars['--sb-bg'] = c
  } else if (bgType === 'gradient') {
    const c1 = resolveGlobalColor(s.bg_gradient_color1) || 'transparent'
    const c2 = resolveGlobalColor(s.bg_gradient_color2) || 'transparent'
    const angle = Number.isFinite(Number(s.bg_gradient_angle)) ? Number(s.bg_gradient_angle) : 180
    outerVars['--sb-bg-img'] = `linear-gradient(${angle}deg, ${c1}, ${c2})`
  } else if (bgType === 'image' && s.bg_image?.url) {
    outerVars['--sb-bg-img'] = `url("${String(s.bg_image.url).replace(/"/g, '%22')}")`
    setResponsiveVar(outerVars, '--sb-bg-size', s.bg_image_size)
    setResponsiveVar(outerVars, '--sb-bg-pos', s.bg_image_position)
  }
  const hasOverlay = bgType === 'image' && !!s.bg_overlay_color
  if (hasOverlay) {
    outerVars['--sb-overlay'] = resolveGlobalColor(s.bg_overlay_color)
    const o = Number(s.bg_overlay_opacity)
    outerVars['--sb-overlay-o'] = String(Number.isFinite(o) ? Math.min(100, Math.max(0, o)) / 100 : 0.5)
  }

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
      'sb-has-bg-img': bgType === 'image' && !!s.bg_image?.url,
      'sb-bg-fixed': bgType === 'image' && !!s.bg_fixed,
      'sb-has-overlay': hasOverlay,
      'sb-has-radius': !!radius,
      ...visibilityClasses(s.hide_on),
    },
    outerVars,
    innerClasses: rowClasses,
    innerVars,
    marginVars,
    widthMode,
    widthVars,
    hasOverlay,
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

  return {
    classes: {
      [`sb-block--${block?.type}`]: true,
      'sb-has-w': hasAny(s.width),
      'sb-has-maxw': hasAny(s.max_width),
      ...visibilityClasses(s.hide_on),
    },
    vars,
    anchorId: s.anchor_id || undefined,
  }
}
