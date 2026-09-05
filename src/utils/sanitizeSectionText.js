// Every text field coming out of the Shop Builder plugin — even plain
// "text" fields like a testimonial name or a button label, not just
// "rich_text" fields like hero_title — gets run through WordPress's
// sanitize_text_field()/sanitize_textarea_field()/wp_kses(), which
// html-entity-encodes any stray `<`/`>`/`&` it finds (e.g. "I love this
// shop! <3" is stored as "I love this shop! &lt;3"). Rendering that with
// plain Vue `{{ }}` interpolation shows the literal "&lt;3" instead of
// "<3", since Vue doesn't decode HTML entities in text nodes.
//
// The fix is to render every field from this config with v-html instead of
// `{{ }}` — which is safe here specifically because it already passed
// through an allow-list sanitizer server-side (either only a few inline
// tags like <strong>/<em>/<span> survived, or any other `<` was long ago
// turned into a harmless entity). Route it through this single function so
// there's one place to swap the implementation later.
import { sanitizeHeroTitle } from 'src/utils/sanitizeHtml.js'

export function sanitizeSectionText(value) {
    return sanitizeHeroTitle(value || '')
}