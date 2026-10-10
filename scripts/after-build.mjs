/**
 * After the build: a store that publishes on itself (scripts/fetch-content.mjs
 * took its files from the store) must not have them in public/ any more.
 *
 * Vercel serves public/ as plain files before anything else, so a build-time
 * copy (/config/home.json, /icons/…) would hide the live version the server
 * reads from the store (src-ssr/site-content.js) until the next build. The
 * build keeps its copy in dist/ssr/client, the server's fallback.
 */
import fs from 'node:fs'
import path from 'node:path'

const MARKER = path.resolve('.qwoo-content.json')
const CONTENT = ['config', 'data', 'sections', 'homepage-hero', 'branding', 'icons', 'favicon.ico']

let source = ''
try {
  source = JSON.parse(fs.readFileSync(MARKER, 'utf-8')).source
} catch {
  // not a store build
}

if (source === 'store') {
  const target = path.resolve('public')
  for (const name of CONTENT) fs.rmSync(path.join(target, name), { recursive: true, force: true })
  console.log('[content] The store serves its own files: removed them from public/.')
}
fs.rmSync(MARKER, { force: true })
