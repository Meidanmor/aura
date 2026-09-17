// src/utils/theme.js
const THEME_TOKENS = {
    'global:primary': 'var(--q-primary)',
    'global:secondary': 'var(--q-secondary)',
    'global:accent': 'var(--q-accent)',
    'global:text': 'var(--q-text)'
}

/**
 * Resolves a CMS color value ("global:primary", a raw hex, or empty)
 * into something CSS can consume directly.
 */
export function resolveGlobalColor(value) {
    if (!value) return ''
    return THEME_TOKENS[value] || value
}