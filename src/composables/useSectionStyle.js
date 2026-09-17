import { computed } from 'vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'

const PADDING_MODES = new Set(['none', 'small', 'medium', 'large', 'custom'])
const WIDTH_MODES = new Set(['full', 'contained'])

// Accepts "40", "40px", "2rem" etc. Bare numbers get "px" appended.
const toCssLength = (v) => {
    if (v === '' || v == null) return null
    return /^-?\d+(\.\d+)?$/.test(String(v).trim()) ? `${v}px` : v
}

export function useSectionStyle(style) {
    const paddingMode = computed(() =>
        PADDING_MODES.has(style?.padding?.mode) ? style.padding.mode : 'medium'
    )
    const widthMode = computed(() =>
        WIDTH_MODES.has(style?.width?.mode) ? style.width.mode : 'full'
    )

    const sectionClasses = computed(() => ({
        'sb-section': true,
        [`sb-section--padding-${paddingMode.value}`]: true,
        [`sb-section--width-${widthMode.value}`]: true
    }))

    const sectionStyleVars = computed(() => {
        const vars = {}

        const bg = style?.background
        if (bg?.type === 'color') {
            const resolved = resolveGlobalColor(bg.color)
            if (resolved) vars['--section-bg'] = resolved
        }
        // room to grow: else if (bg?.type === 'image') { vars['--section-bg-image'] = ... }

        if (style?.min_height) {
            const h = toCssLength(style.min_height)
            if (h) vars['--section-min-height'] = h
        }

        if (paddingMode.value === 'custom') {
            const c = style.padding.custom || {}
            ;['top', 'right', 'bottom', 'left'].forEach((side) => {
                const len = toCssLength(c[side])
                if (len) vars[`--section-padding-${side}`] = len
            })
        }

        return vars
    })

    return { sectionClasses, sectionStyleVars }
}