// api/sitemap.js
import fs from 'fs';
import path from 'path';

function escapeXml(value) {
  return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
}

/**
 * The live list from the store (qwoo/v1/sitemap): published, visible
 * products and categories with their last change, minus anything the owner
 * keeps out of search engines. { base, urls: [ { path, lastmod } ] } or null.
 */
async function fromStore() {
  const backend = process.env.WP_BACKEND_URL;
  if (!backend) return null;
  try {
    const res = await fetch(`${backend}/wp-json/qwoo/v1/sitemap`, {
      headers: { 'x-proxy-secret': process.env.PROXY_SHARED_SECRET || '' }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return Array.isArray(json?.urls) ? json : null;
  } catch (e) {
    console.error('[sitemap] the store did not answer', e);
    return null;
  }
}

/** The products published with the last build, when the store can't be reached. */
function fromBuild() {
  try {
    const products = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/data/products.json'), 'utf-8'));
    return {
      base: '',
      urls: [
        { path: '/', lastmod: '' },
        { path: '/products', lastmod: '' },
        ...products.filter(p => p.slug).map(p => ({ path: `/product/${p.slug}`, lastmod: '' }))
      ]
    };
  } catch (e) {
    console.error('Failed to read products.json', e);
    return { base: '', urls: [{ path: '/', lastmod: '' }] };
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const list = (await fromStore()) || fromBuild();
  const siteUrl = (list.base || `${protocol}://${req.headers.host}`).replace(/\/+$/, '');

  // Shared caches keep it for 10 minutes; a stale copy may be served for a
  // day while a fresh one is fetched.
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${list.urls.map(u => `  <url>
    <loc>${escapeXml(siteUrl + u.path)}</loc>${u.lastmod ? `
    <lastmod>${escapeXml(u.lastmod)}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;

  res.status(200).send(sitemap);
}
