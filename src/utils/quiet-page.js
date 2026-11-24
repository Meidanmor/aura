// src/utils/quiet-page.js

/**
 * The checkout is a quiet page: the store's own prompts never pop up over it (the
 * notifications ask, the add-to-home-screen gift card…), so nothing gets between the
 * shopper and paying (owner, 2026-11-24). They wait and show on a later page instead.
 * The owner's own popups (Store builder → Popups) are not touched: they follow their own
 * page rules ("never on these pages").
 * A language prefix like /en/ may come first.
 */
const QUIET = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?checkout(?:\/|$)/i

export function isQuietPage(path) {
  return QUIET.test(String(path || ''))
}
