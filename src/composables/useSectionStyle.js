import { computed } from 'vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'

const PADDING_MODES = new Set(['none', 'small', 'medium', 'large', 'custom'])
const PADDING_MODE_MAP = {
    none: 'n',
    small: 's',
    medium: 'm',
    large: 'l',
    custom: 'c',
}
const WIDTH_MODES = new Set(['full', 'contained', 'custom'])


// Accepts "40", "40px", "2rem" etc. Bare numbers get "px" appended.
const toCssLength = (v) => {
    if (v === '' || v == null) return null
    return /^-?\d+(\.\d+)?$/.test(String(v).trim()) ? `${v}px` : v
}

// useSectionStyle.js
export function buildSectionClasses(style = {}, isInnerSec = false) {
    const mode = style?.padding?.mode
    const paddingMode = PADDING_MODES.has(mode) ? PADDING_MODE_MAP[mode] : 'm'
    const widthMode = WIDTH_MODES.has(style?.width?.mode) ? style.width.mode : 'full'
    const n = style?.nesting || {}

    return {
        'sb-section': true,
        [`sb-p${paddingMode}`]: true,
        [`sb-section--width-${widthMode}`]: true,
        'sb-inner-sec': isInnerSec,

        'justify-center': n.justify_content === 'center',
        'justify-end': n.justify_content === 'flex-end',
        'justify-start': n.justify_content === 'flex-start',
        'justify-around': n.justify_content === 'space-around',
        'justify-between': n.justify_content === 'space-between',
        'justify-evenly': n.justify_content === 'space-evenly',

        flex: !!n.flex_direction && n.flex_direction !== 'null',
        column: n.flex_direction === 'column' || n.flex_direction === 'column-reverse',
        wrap: n.flex_wrap === 'wrap',
        'no-wrap': n.flex_wrap === 'nowrap',
        'items-center': n.align_items === 'center',
        'items-start': n.align_items === 'flex-start',
        'items-end': n.align_items === 'flex-end',
    }
}

export function buildSectionStyleVars(style = {}) {
    const vars = {}
    const bg = style?.background
    if (bg?.type === 'color') {
        const resolved = resolveGlobalColor(bg.color)
        if (resolved) vars['--section-bg'] = resolved
    }
    const h = toCssLength(style?.min_height)
    if (h) vars['--section-min-height'] = h
    const hm = toCssLength(style?.min_height_mobile)
    if (hm) vars['--section-min-height-mobile'] = hm

    if (PADDING_MODES.has(style?.padding?.mode) && style.padding.mode === 'custom') {
        const c = style.padding.custom || {}
        const cm = style.padding.custom_mobile || {}
        const sides = { top: 't', right: 'r', bottom: 'b', left: 'l' }
        for (const [side, key] of Object.entries(sides)) {
            const len = toCssLength(c[side])
            if (len) vars[`--sb-p${key}`] = len
            const lenM = toCssLength(cm[side])
            if (lenM) vars[`--sb-p${key}-m`] = lenM
        }
    }
    return vars
}

export function useSectionStyle(getStyle, isInnerSec = false) {
    const sectionClasses = computed(() => buildSectionClasses(getStyle() || {}, isInnerSec))
    const sectionStyleVars = computed(() => buildSectionStyleVars(getStyle() || {}))
    return { sectionClasses, sectionStyleVars }
}