import { computed } from 'vue'
import { resolveGlobalColor } from 'src/utils/resolve-global-color.js'

const PADDING_MODES = new Set(['none', 'small', 'medium', 'large', 'custom'])
const WIDTH_MODES = new Set(['full', 'contained'])

// Accepts "40", "40px", "2rem" etc. Bare numbers get "px" appended.
const toCssLength = (v) => {
    if (v === '' || v == null) return null
    return /^-?\d+(\.\d+)?$/.test(String(v).trim()) ? `${v}px` : v
}

export function useSectionStyle(getStyle) {
    const style = computed(() => getStyle() || {})

    const paddingMode = computed(() =>
        PADDING_MODES.has(style.value?.padding?.mode) ? style.value.padding.mode : 'medium'
    )
    const widthMode = computed(() =>
        WIDTH_MODES.has(style.value?.width?.mode) ? style.value.width.mode : 'full'
    )

    const sectionClasses = computed(() => ({
        'sb-section': true,
        [`sb-section--padding-${paddingMode.value}`]: true,
        [`sb-section--width-${widthMode.value}`]: true
    }))

    const sectionStyleVars = computed(() => {
        const vars = {}
        const s = style.value
        const bg = s?.background
        if (bg?.type === 'color') {
            const resolved = resolveGlobalColor(bg.color)
            if (resolved) vars['--section-bg'] = resolved
        }
        const h = toCssLength(s?.min_height)
        if (h) vars['--section-min-height'] = h
        const hm = toCssLength(s?.min_height_mobile)
        if (hm) vars['--section-min-height-mobile'] = hm

        if (paddingMode.value === 'custom') {
            const c = s.padding.custom || {}
            const cm = s.padding.custom_mobile || {}
            ;['top', 'right', 'bottom', 'left'].forEach((side) => {
                const len = toCssLength(c[side])
                if (len) vars[`--section-padding-${side}`] = len
                const lenM = toCssLength(cm[side])
                if (lenM) vars[`--section-padding-${side}-mobile`] = lenM
            })
        }
        return vars
    })

    return { sectionClasses, sectionStyleVars }
}