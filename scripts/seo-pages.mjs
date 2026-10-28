import { fileURLToPath } from "node:url";
import { importTS } from "./import-ts.mjs";

const { absoluteSiteUrl, canonicalPageUrl, modelMetadata, SITE_PATH } = await importTS(fileURLToPath(new URL("../src/lib/catalogMetadata.ts", import.meta.url)));
export const escapeHtml = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderLanding(template, metadata, content, product) {
  let html = template;
  const replace = (pattern, replacement) => {
    if (!pattern.test(html)) throw new Error(`Missing HTML template tag: ${pattern}`);
    html = html.replace(pattern, () => replacement);
  };
  replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(metadata.title)}</title>`);
  replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(metadata.description)}" />`);
  replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${escapeHtml(metadata.canonical)}" />`);
  for (const [key, value] of Object.entries({ title: metadata.title, description: metadata.description, url: metadata.canonical, image: metadata.image, type: product ? "product" : "website" })) {
    replace(new RegExp(`<meta\\s+property="og:${key}"\\s+content="[^"]*"\\s*\\/>`), `<meta property="og:${key}" content="${escapeHtml(value)}" />`);
  }
  replace(/<div id="root"><\/div>/, `<div id="root">${content}</div>`);
  const schema = product ? `<script id="model-product-schema" type="application/ld+json">${JSON.stringify(product).replace(/</g, "\\u003c")}</script>` : "";
  return html.replace("</head>", `<meta property="og:image:alt" content="${escapeHtml(metadata.alt || metadata.title)}" />\n${schema}</head>`);
}

export function renderModelPage(template, model, categoryLabel) {
  const meta = modelMetadata(model, categoryLabel);
  const details = [["القسم", categoryLabel], ["الخامة", model.material], ["اللون", model.color], ["كود اللون", model.colorCode], ["القياسات", model.dimensions]]
    .filter(([, value]) => value?.trim()).map(([key, value]) => `<div><dt>${key}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  const images = (meta.product.image || []).map((url, i) => {
    const image = `<img class="aspect-[3/4] max-h-[600px] object-contain" src="${escapeHtml(url)}" alt="${escapeHtml(meta.alt)} — صورة ${i + 1}" loading="${i === 0 ? "eager" : "lazy"}" />`;
    // React loads other originals only when visited. Keep their crawlable/no-JS
    // fallback without letting the HTML preload scanner download the entire gallery.
    return i === 0 ? image : `<noscript>${image}</noscript>`;
  }).join("");
  const content = `<main class="mx-auto max-w-content px-4 py-14 sm:px-6 lg:py-20"><h1 class="font-display text-3xl font-extrabold text-ink">${escapeHtml(meta.name)}</h1><p>${escapeHtml(meta.description)}</p>${images}<dl>${details}</dl>${model.specs?.length ? `<ul>${model.specs.map((spec) => `<li>${escapeHtml(spec)}</li>`).join("")}</ul>` : ""}<a href="${absoluteSiteUrl("/")}">ميكا للأبواب</a></main>`;
  return renderLanding(template, meta, content, meta.product);
}

export function renderSitemap(models, categories) {
  const paths = ["/", "/popular", ...categories.filter((category) => models.some((model) => model.category === category.id)).map((category) => `/${encodeURIComponent(category.id)}`), ...models.map((model) => `/model/${encodeURIComponent(model.id)}`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(paths)].map((route) => `  <url><loc>${escapeHtml(canonicalPageUrl(route))}</loc></url>`).join("\n")}\n</urlset>\n`;
}

export function renderRobots() {
  return `User-agent: *\nAllow: /\nDisallow: ${SITE_PATH}/admin\nDisallow: ${SITE_PATH}/reset-password\n\nSitemap: ${absoluteSiteUrl("/sitemap.xml")}\n`;
}
