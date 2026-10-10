import fs from 'fs';
import path from 'path';

/**
 * One of the store's published files ('config/languages.json',
 * 'data/products.json'): from the site itself, which serves the live version
 * (src-ssr/site-content.js), else the copy built into the deployment. null
 * when neither has it.
 */
export async function publishedJson(siteUrl, file) {
  try {
    const res = await fetch(`${siteUrl}/${file}`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) return await res.json();
    if (res.status === 404) return null;
  } catch {
    // the copy built in below
  }
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', file), 'utf-8'));
  } catch {
    return null;
  }
}
