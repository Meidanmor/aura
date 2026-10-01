/**
 * Regenerates the native app's icons and splash screens from the same
 * images the website uses, so they never drift apart:
 *
 *   App icon        the Branding "App icon" (public/branding/<file>), else
 *                   public/icons/icon-512x512.png
 *   Adaptive icon   public/icons/icon-maskable-512x512.png (has the safe
 *                   zone Android's round/squircle masks need) on the PWA
 *                   background color
 *   Splash screen   the Branding logo (e.g. Aura-logo.svg), centered on the
 *                   PWA background color
 *
 * All of these are published by the qwoo-core plugin (Branding + "Generate
 * icons"), so after pulling the latest push just run:
 *
 *   npm run icons:native        (also runs as part of `npm run build:android`)
 *
 * Uses the official @capacitor/assets generator under the hood (writes every
 * Android density into src-capacitor/android/app/src/main/res).
 */
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const capDir = join(root, 'src-capacitor')
const stageName = '.native-assets'
const stageDir = join(capDir, stageName)

const readJson = (rel) => {
  try { return JSON.parse(readFileSync(join(root, 'public', rel), 'utf8')) } catch { return {} }
}
const publicFile = (...parts) => {
  const file = join(root, 'public', ...parts)
  return existsSync(file) ? file : null
}
/** A Branding image published to public/branding/, matched by file name. */
const brandingFile = (url) => (url ? publicFile('branding', basename(String(url).split('?')[0])) : null)

const pwa = readJson('config/pwa.json')
const branding = readJson('config/branding.json')
const background = /^#[0-9a-f]{3,8}$/i.test(pwa.background_color || '') ? pwa.background_color : '#ffffff'

const iconSrc = brandingFile(branding.app_icon) || publicFile('icons', 'icon-512x512.png')
const foregroundSrc = publicFile('icons', 'icon-maskable-512x512.png') || iconSrc
const logoSrc = brandingFile(branding.logo)

if (!iconSrc) {
  console.error('No app icon found (Branding app icon or public/icons/icon-512x512.png). Generate icons in the plugin and pull first.')
  process.exit(1)
}

const load = (file) => sharp(file, file.endsWith('.svg') ? { density: 600 } : {})
const square = (size) => sharp({ create: { width: size, height: size, channels: 4, background } })

rmSync(stageDir, { recursive: true, force: true })
mkdirSync(stageDir, { recursive: true })

// Legacy (square) icon: the full app icon, flattened on the background.
await load(iconSrc).resize(1024, 1024, { fit: 'contain', background }).flatten({ background })
  .png().toFile(join(stageDir, 'icon-only.png'))

// Adaptive icon layers.
await load(foregroundSrc).resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png().toFile(join(stageDir, 'icon-foreground.png'))
await square(1024).png().toFile(join(stageDir, 'icon-background.png'))

// Splash: the logo centered (sized to stay visible when Android center-crops
// the square splash to a portrait screen), or the app icon if no logo.
const splashLogo = await load(logoSrc || iconSrc)
  .resize(logoSrc ? { width: 900 } : { width: 600, height: 600, fit: 'contain', background })
  .png().toBuffer()
await square(2732).composite([{ input: splashLogo, gravity: 'center' }])
  .png().toFile(join(stageDir, 'splash.png'))

console.log(`Sources: icon=${basename(iconSrc)}, adaptive=${basename(foregroundSrc)}, splash=${logoSrc ? basename(logoSrc) : basename(iconSrc)}, background=${background}`)

const result = spawnSync('npx', ['capacitor-assets', 'generate', '--android', '--assetPath', stageName], {
  cwd: capDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
rmSync(stageDir, { recursive: true, force: true })
process.exit(result.status ?? 1)
