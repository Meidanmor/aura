// api/llms.js
import { publishedJson } from './_published.js';

// Same fallback values used by src/composables/useSeo.js's fetchSeoForPath,
// kept in sync manually since this file runs standalone (outside the Vite/
// SSR bundle) and can't safely import that module here.
const SEO_FALLBACK = {
    title: '',
    description: ''
};

async function fetchHomepageSeo() {
    const backend = process.env.WP_BACKEND_URL;
    const proxySecret = process.env.PROXY_SHARED_SECRET;
    if (!backend) return SEO_FALLBACK;

    try {
        const res = await fetch(`${backend}/wp-json/qwoo/v1/seo?path=homepage`, {
            headers: {'x-proxy-secret': proxySecret}
        });
        if (!res.ok) return SEO_FALLBACK;
        const json = await res.json();
        return {
            title: json.title || SEO_FALLBACK.title,
            description: json.description || SEO_FALLBACK.description
        };
    } catch (e) {
        console.error('[llms.js] failed to fetch homepage SEO', e);
        return SEO_FALLBACK;
    }
}

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const siteUrl = `${protocol}://${req.headers.host}`;

    const { title: siteName, description: siteDescription } = await fetchHomepageSeo();

    // The products backup the store publishes (data/*.json).
    const [productsData, categoriesData] = await Promise.all([
        publishedJson(siteUrl, 'data/products.json'),
        publishedJson(siteUrl, 'data/categories.json'),
    ]);
    const products = Array.isArray(productsData) ? productsData : [];
    const categories = Array.isArray(categoriesData) ? categoriesData : [];

    // Strip HTML tags from WooCommerce's rich-text description down to a
    // short plain-text summary — this file is meant to be read, not rendered.
    const toPlainSummary = (html, maxLen = 160) => {
        if (!html) return '';
        const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        return text.length > maxLen ? `${text.slice(0, maxLen).trim()}...` : text;
    };

    const staticPages = [
        { path: '/', label: 'Home', description: 'Storefront homepage' },
        { path: '/products', label: 'All Products', description: 'Full product catalog' },
    ];

    const pagesSection = staticPages
        .map(p => `- [${p.label}](${siteUrl}${p.path}): ${p.description}`)
        .join('\n');

    const categoriesSection = categories.length
        ? categories
            .filter(c => c.slug !== 'uncategorized')
            .map(c => `- [${c.name}](${siteUrl}/product-category/${c.slug}): ${c.count} product${c.count === 1 ? '' : 's'}`)
            .join('\n')
        : '';

    const productsSection = products
        .map(p => {
            const summary = toPlainSummary(p.short_description) || toPlainSummary(p.description);
            return `- [${p.name}](${siteUrl}/product/${p.slug})${summary ? `: ${summary}` : ''}`;
        })
        .join('\n');

    const llms = `# ${siteName}

> ${siteDescription}

## Pages
${pagesSection}
${categoriesSection
        ? `
## Categories
${categoriesSection}
`
        : ''}
## Products
${productsSection}
`;

    res.status(200).send(llms.trim());
}