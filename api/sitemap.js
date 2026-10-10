// api/sitemap.js
import { publishedJson } from './_published.js';

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
async function fromStore(lang = '') {
  const backend = process.env.WP_BACKEND_URL;
  if (!backend) return null;
  try {
    const res = await fetch(`${backend}/wp-json/qwoo/v1/sitemap`, {
      headers: { 'x-proxy-secret': process.env.PROXY_SHARED_SECRET || '', ...(lang ? { 'x-qwoo-lang': lang } : {}) }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return Array.isArray(json?.urls) ? json : null;
  } catch (e) {
    console.error('[sitemap] the store did not answer', e);
    return null;
  }
}

/** The store's live extra languages and their address prefixes (config/languages.json). */
async function extraLanguages(siteUrl) {
  try {
    const data = (await publishedJson(siteUrl, 'config/languages.json')) || {};
    return (Array.isArray(data.extra) ? data.extra : [])
      .filter((code) => /^[a-z]{2}$/.test(code) && code !== data.main)
      .map((code) => ({ code, prefix: String(data.prefixes?.[code] || code) }));
  } catch {
    return [];
  }
}

/** The products backup (data/products.json), when the store can't be reached. */
async function fromBuild(siteUrl) {
  try {
    const products = await publishedJson(siteUrl, 'data/products.json');
    if (!Array.isArray(products)) throw new Error('no products backup');
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
  const ownUrl = `${protocol}://${req.headers.host}`;
  const list = (await fromStore()) || (await fromBuild(ownUrl));
  const siteUrl = (list.base || ownUrl).replace(/\/+$/, '');
  const entries = list.urls.map((u) => ({ loc: siteUrl + u.path, lastmod: u.lastmod }));

  // Each extra language's own addresses (/en/…): the store lists what exists
  // in it (its pages and translated posts), behind its prefix.
  for (const { code, prefix } of await extraLanguages(ownUrl)) {
    const own = await fromStore(code);
    if (!own) continue;
    const base = (own.base || `${siteUrl}/${prefix}`).replace(/\/+$/, '');
    for (const u of own.urls) entries.push({ loc: u.path === '/' ? base : base + u.path, lastmod: u.lastmod });
  }

  // Shared caches keep it for 10 minutes; a stale copy may be served for a
  // day while a fresh one is fetched.
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(u => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `
    <lastmod>${escapeXml(u.lastmod)}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;

  res.status(200).send(sitemap);
}
