// The blog's built-in layouts, used until the owner publishes their own
// (Store builder → Blog). The same as the store's default_template_sections().

const block = (id, type, data = {}) => ({ id, type, enabled: true, style: {}, data })

/** The built-in layouts with their texts ("More to read", "All"…) in the store's language. */
export function localizeDefaults(sections, t) {
  const TEXT_KEYS = ['label', 'title', 'all_label']
  return sections.map((s) => ({
    ...s,
    blocks: s.blocks.map((b) => ({ ...b, data: Object.fromEntries(Object.entries(b.data).map(([k, v]) => [k, TEXT_KEYS.includes(k) && typeof v === 'string' ? t(v) : v])) })),
  }))
}

export const DEFAULT_BLOG_POST_SECTIONS = [{
  id: 'sec_defaultpost',
  enabled: true,
  style: { width_mode: 'custom', width: { desktop: '760px' }, padding_preset: 'small', gap: { desktop: '16px' }, direction: { desktop: 'column' } },
  blocks: [
    block('blk_dpback', 'post_back', { label: '← Blog' }),
    block('blk_dpmeta', 'post_meta', { show_date: true, show_categories: true, align: 'left' }),
    block('blk_dptitle', 'post_title', { tag: 'h1', align: 'left' }),
    block('blk_dpimage', 'post_featured_image', { ratio: '', rounded: true }),
    block('blk_dpcontent', 'post_content'),
    block('blk_dpmore', 'post_more', { title: 'More to read', count: 3 }),
  ],
}]

export const DEFAULT_BLOG_SECTIONS = [{
  id: 'sec_defaultblog',
  enabled: true,
  style: { width_mode: 'contained', padding_preset: 'small', gap: { desktop: '20px' }, direction: { desktop: 'column' } },
  blocks: [
    block('blk_dbtitle', 'blog_title', { title: 'Blog', show_description: true, align: 'left' }),
    block('blk_dbcats', 'blog_categories', { all_label: 'All' }),
    block('blk_dbposts', 'blog_posts', { per_page: 9, columns: { desktop: 3, tablet: 2, mobile: 1 }, show_excerpt: true, show_date: true, show_image: true }),
  ],
}]

/** Posts per page: from the layout's "Blog Posts Grid" block (9 without one). */
export function postsPerPage(sections) {
  const find = (blocks) => {
    for (const b of blocks || []) {
      if (b?.type === 'blog_posts') return b
      const inner = b?.type === 'section' ? find(b.blocks) : null
      if (inner) return inner
    }
    return null
  }
  for (const s of sections || []) {
    const b = find(s.blocks)
    if (b) return Math.max(1, Math.min(24, Number(b.data?.per_page) || 9))
  }
  return 9
}
