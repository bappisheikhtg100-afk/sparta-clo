import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');
const indexPath = path.join(distDir, 'index.html');
const siteOrigin = 'https://spartaclo.com';

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html not found. Run vite build first.');
  process.exit(1);
}

const baseHtml = fs.readFileSync(indexPath, 'utf-8');

// Bundle src/data/storeData.ts in-memory with asset stubs to inspect PRODUCTS cleanly
const result = await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/data/storeData.ts')],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  define: {
    'import.meta.env.BASE_URL': '"/"',
  },
  plugins: [
    {
      name: 'stub-images',
      setup(build) {
        build.onResolve({ filter: /\.(jpg|jpeg|png|webp|svg|mp4)$/i }, (args) => ({
          path: args.path,
          namespace: 'stub-img',
        }));
        build.onLoad({ filter: /.*/, namespace: 'stub-img' }, () => ({
          contents: 'module.exports = "/assets/brand/logo-black.png";',
          loader: 'js',
        }));
      },
    },
  ],
});

const moduleCode = result.outputFiles[0].text;
const mod = { exports: {} };
const fn = new Function('exports', 'require', 'module', moduleCode);
fn(mod.exports, require, mod);
const products = mod.exports.PRODUCTS || [];

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPriceInfo(product) {
  if (product.priceMap) {
    const vals = Object.values(product.priceMap).map(Number);
    const min = Math.min(...vals);
    return { price: min, isStarting: true };
  }
  return { price: Number(product.price || 0), isStarting: false };
}

function toAbsImage(imgPath = '/assets/brand/logo-black.png') {
  if (!imgPath) return `${siteOrigin}/assets/brand/logo-black.png`;
  if (imgPath.startsWith('http')) return imgPath;
  return `${siteOrigin}${imgPath.startsWith('/') ? imgPath : '/' + imgPath}`;
}

function replaceMetaTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

function buildSeoHtml({
  title,
  description,
  canonicalUrl,
  ogImage,
  jsonLd,
  rootFallbackHtml,
}) {
  let out = baseHtml;

  out = replaceMetaTag(
    out,
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(title)}</title>`
  );
  out = replaceMetaTag(
    out,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(description)}" />`
  );
  out = replaceMetaTag(
    out,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`
  );
  out = replaceMetaTag(
    out,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`
  );
  out = replaceMetaTag(
    out,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(title)}" />`
  );
  out = replaceMetaTag(
    out,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(description)}" />`
  );
  out = replaceMetaTag(
    out,
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`
  );
  out = replaceMetaTag(
    out,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`
  );
  out = replaceMetaTag(
    out,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`
  );
  out = replaceMetaTag(
    out,
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`
  );

  if (jsonLd) {
    const ldScript = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n  </head>`;
    out = out.replace('</head>', ldScript);
  }

  out = out.replace(
    '<div id="root"></div>',
    `<div id="root">${rootFallbackHtml}</div>`
  );

  return out;
}

const catalogFallbackCards = products
  .map((p) => {
    const { price, isStarting } = getPriceInfo(p);
    const img = toAbsImage(p.images?.[0]);
    return `
      <article>
        <a href="/product/${escapeHtml(p.id)}/">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" width="300" height="400" />
          <h2>${escapeHtml(p.name)}</h2>
        </a>
        <p>${escapeHtml(p.category)} · ${isStarting ? 'From ' : ''}৳${price}</p>
        <p>${escapeHtml(p.description)}</p>
      </article>`;
  })
  .join('\n');

// 1. Enrich root dist/index.html with semantic crawlable storefront content inside #root
const homeFallbackHtml = `
  <main style="max-width:1200px;margin:0 auto;padding:24px;font-family:sans-serif">
    <header>
      <h1>SPARTA — Minimalist Luxury Apparel &amp; Fragrance</h1>
      <p>SPARTA (SPARTA CLO) is Bangladesh's premier minimalist luxury clothing brand and fragrance house. Cash on Delivery nationwide across Bangladesh.</p>
      <nav aria-label="Main Categories">
        <a href="/collection/">Explore Full Archive Collection</a>
      </nav>
    </header>
    <section aria-label="Featured Archive Pieces">
      ${catalogFallbackCards}
    </section>
  </main>
`;

const enrichedHomeHtml = buildSeoHtml({
  title: 'SPARTA — Minimalist Luxury Apparel & Fragrance | Official Store',
  description:
    "SPARTA (SPARTA CLO) is Bangladesh's premier minimalist luxury clothing brand and fragrance house. Shop knitwear, tailored trousers, sneakers, and artisanal perfumes with Cash on Delivery nationwide.",
  canonicalUrl: `${siteOrigin}/`,
  ogImage: `${siteOrigin}/assets/brand/logo-black.png`,
  jsonLd: null,
  rootFallbackHtml: homeFallbackHtml,
});
fs.writeFileSync(indexPath, enrichedHomeHtml, 'utf-8');

// 2. Generate /collection/index.html (HTTP 200 on GitHub Pages)
const collectionDir = path.join(distDir, 'collection');
fs.mkdirSync(collectionDir, { recursive: true });
const collectionHtml = buildSeoHtml({
  title: 'Archive Collection — SPARTA | Minimalist Luxury Apparel & Fragrance',
  description:
    'Browse the complete SPARTA (SPARTA CLO) Bangladesh collection: cable knit sweaters, flare formal trousers, Oxford shirts, sneakers, and artisanal Eau de Parfum.',
  canonicalUrl: `${siteOrigin}/collection/`,
  ogImage: `${siteOrigin}/assets/products/spartan-white.png`,
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'SPARTA Archive Collection',
    url: `${siteOrigin}/collection/`,
    isPartOf: { '@id': `${siteOrigin}/#website` },
  },
  rootFallbackHtml: `
    <main style="max-width:1200px;margin:0 auto;padding:24px;font-family:sans-serif">
      <h1>SPARTA Archive Collection</h1>
      <p>Contemporary luxury menswear, tailored silhouettes, court footwear, and artisanal fragrances with Cash on Delivery across Bangladesh.</p>
      <p><a href="/">Back to SPARTA Home</a></p>
      <section>${catalogFallbackCards}</section>
    </main>
  `,
});
fs.writeFileSync(path.join(collectionDir, 'index.html'), collectionHtml, 'utf-8');

// 3. Generate /product/<id>/index.html for every product (HTTP 200 + Schema.org/Product JSON-LD)
for (const product of products) {
  const prodDir = path.join(distDir, 'product', product.id);
  fs.mkdirSync(prodDir, { recursive: true });

  const { price } = getPriceInfo(product);
  const prodUrl = `${siteOrigin}/product/${product.id}/`;
  const primaryImg = toAbsImage(product.images?.[0]);
  const prodDesc = `${product.name} by SPARTA Bangladesh (${product.category}). ${product.description} Cash on Delivery nationwide.`;
  const availability =
    product.stock === 'in-stock'
      ? 'https://schema.org/InStock'
      : product.stock === 'coming-soon'
      ? 'https://schema.org/PreOrder'
      : 'https://schema.org/OutOfStock';

  const prodSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.id.toUpperCase(),
    category: product.category,
    description: product.description,
    image: (product.images || []).map(toAbsImage),
    brand: {
      '@type': 'Brand',
      name: 'SPARTA',
    },
    offers: {
      '@type': 'Offer',
      url: prodUrl,
      price,
      priceCurrency: 'BDT',
      availability,
      seller: {
        '@type': 'Organization',
        name: 'SPARTA Atelier',
      },
    },
  };

  const detailsList = (product.details || [])
    .map((d) => `<li>${escapeHtml(d)}</li>`)
    .join('\n');

  const prodFallbackHtml = `
    <main style="max-width:1000px;margin:0 auto;padding:24px;font-family:sans-serif">
      <nav aria-label="Breadcrumb">
        <a href="/">SPARTA Home</a> / <a href="/collection/">Collection</a> / <span>${escapeHtml(product.name)}</span>
      </nav>
      <h1>${escapeHtml(product.name)}</h1>
      <p><strong>Category:</strong> ${escapeHtml(product.category)} · <strong>Price:</strong> ৳${price}</p>
      <img src="${escapeHtml(primaryImg)}" alt="${escapeHtml(product.name)}" width="500" height="650" />
      <p>${escapeHtml(product.description)}</p>
      ${detailsList ? `<ul>${detailsList}</ul>` : ''}
      <p>Cash on Delivery across Dhaka &amp; all districts of Bangladesh.</p>
    </main>
  `;

  const prodHtml = buildSeoHtml({
    title: `${product.name} — SPARTA | Minimalist Luxury Apparel & Fragrance`,
    description: prodDesc,
    canonicalUrl: prodUrl,
    ogImage: primaryImg,
    jsonLd: prodSchema,
    rootFallbackHtml: prodFallbackHtml,
  });

  fs.writeFileSync(path.join(prodDir, 'index.html'), prodHtml, 'utf-8');
}

// 4. Generate clean HTTP-200 sitemap.xml inside both public/ and dist/
const today = new Date().toISOString().split('T')[0];
const productUrlEntries = products
  .map((p) => {
    const primaryImg = toAbsImage(p.images?.[0]);
    return `  <url>
    <loc>${siteOrigin}/product/${escapeHtml(p.id)}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
    <image:image>
      <image:loc>${escapeHtml(primaryImg)}</image:loc>
      <image:title>${escapeHtml(p.name)} — SPARTA Bangladesh</image:title>
      <image:caption>${escapeHtml(p.description)}</image:caption>
    </image:image>
  </url>`;
  })
  .join('\n\n');

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${siteOrigin}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <url>
    <loc>${siteOrigin}/collection/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

${productUrlEntries}
</urlset>
`;

fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf-8');
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf-8');

console.log(`Generated static SEO pages for ${products.length} products + /collection/ + enriched / and sitemap.xml.`);
