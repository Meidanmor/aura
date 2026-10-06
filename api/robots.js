// api/robots.js
export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  const host = String(req.headers.host || '');
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const siteUrl = `${protocol}://${host}`;

  // The deployment's internal *.vercel.app address isn't the store's: keep
  // search engines on the store's own address.
  if (/\.vercel\.app$/i.test(host.split(':')[0])) {
    res.status(200).send('User-agent: *\nDisallow: /');
    return;
  }

  // Private pages (they also say noindex) and the backend's admin.
  const robots = `
User-agent: *
Disallow: /cart
Disallow: /checkout
Disallow: /my-account
Disallow: /thank-you
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /auth/
Disallow: /wp-admin/

Sitemap: ${siteUrl}/sitemap.xml
`;

  res.status(200).send(robots.trim());
}
