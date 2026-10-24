/**
 * After the build: a platform store's files (scripts/fetch-content.mjs took
 * them from the store or from its content repo) must not stay in public/.
 *
 * Vercel serves public/ as plain files before anything else, so a build-time
 * copy (/config/home.json, /icons/…) would hide the live version the server
 * reads from the store (src-ssr/site-content.js) until the next build. The
 * build keeps its copy in dist/ssr/client, the server's fallback.
 *
 * A build from the content repo too: a new store's first build comes before
 * the store switches to publishing on itself, and its template's files stayed
 * in front of every later publish (found 2026-10-24 on a new store). Stores
 * that still publish to GitHub get the same files from the fallback.
 */
import fs from 'node:fs'
import path from 'node:path'

const MARKER = path.resolve('.qwoo-content.json')
const CONTENT = ['config', 'data', 'sections', 'homepage-hero', 'branding', 'brand-fonts', 'icons', 'favicon.ico']

let source = ''
try {
  source = JSON.parse(fs.readFileSync(MARKER, 'utf-8')).source
} catch {
  // not a store build
}

if (source === 'store' || source === 'repo') {
  const target = path.resolve('public')
  for (const name of CONTENT) fs.rmSync(path.join(target, name), { recursive: true, force: true })
  console.log('[content] The server serves the store\'s files: removed them from public/.')
}
fs.rmSync(MARKER, { force: true })
