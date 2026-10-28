import path from "node:path";
import { mkdir, mkdtemp, readFile, writeFile, rename, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { importTS } from "./import-ts.mjs";
import { renderModelPage, renderLanding, renderSitemap, renderRobots, escapeHtml } from "./seo-pages.mjs";
const { modelMetadata, canonicalPageUrl, absoluteSiteUrl } = await importTS(fileURLToPath(new URL("../src/lib/catalogMetadata.ts", import.meta.url)));

function safeId(id) {
  if (typeof id !== "string" || !/^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(id) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(id)) throw Error("Invalid page ID");
  return id;
}

/** Real and isolated builds share this writer. Input must be fully read before it runs. */
export async function writeCatalogSnapshot({ distDir, template, models, categories }) {
  const root = path.resolve(distDir);
  const ids = models.map(model => safeId(model.id));
  if (new Set(ids).size !== ids.length) throw Error("Duplicate model ID");
  const labels = new Map(categories.map(category => [category.id, category.label]));
  // Render/validate everything before touching previously generated pages.
  const modelPages = models.map(model => ({ id: model.id, html: renderModelPage(template, model, labels.get(model.category) || "") }));
  const listings = [
    ...categories.filter(category => models.some(model => model.category === category.id)).map(category => ({ id: category.id, title: category.label, description: category.description || category.label, models: models.filter(model => model.category === category.id) })),
    { id: "popular", title: "الأكثر طلباً", description: "موديلات ميكا للأبواب المختارة ضمن الأكثر طلباً.", models: models.filter(model => model.isPopular) },
  ];
  const listingPages = listings.map(listing => {
    safeId(listing.id);
    if (["admin", "reset-password", "search", "model", "assets", "images"].includes(listing.id)) throw Error("Reserved category ID");
    const metadata = { title: `${listing.title} | ميكا للأبواب`, description: listing.description, canonical: canonicalPageUrl(`/${encodeURIComponent(listing.id)}`), image: absoluteSiteUrl("/images/brand/mega-door-logo.png") };
    const links = listing.models.map(model => { const meta = modelMetadata(model, labels.get(model.category) || ""); return `<li><a href="${meta.canonical}">${escapeHtml(meta.name)}</a></li>`; }).join("");
    return { id: listing.id, html: renderLanding(template, metadata, `<main class="mx-auto max-w-content px-4 py-14"><h1>${escapeHtml(listing.title)}</h1><p>${escapeHtml(listing.description)}</p><ul>${links}</ul></main>`) };
  });
  if (new Set(listingPages.map(page => page.id)).size !== listingPages.length) throw Error("Duplicate listing ID");
  const sitemap = renderSitemap(models, categories), robots = renderRobots();
  await mkdir(root, { recursive: true });
  const stage = await mkdtemp(path.join(root, ".seo-next-"));
  async function removeChild(target) {
    const resolved = path.resolve(target);
    if (!resolved.startsWith(root + path.sep) || resolved === root) throw Error("Unsafe SEO cleanup path");
    await rm(resolved, { recursive: true, force: true });
  }
  try {
    await mkdir(path.join(stage, "model"));
    for (const page of modelPages) {
      const target = path.join(stage, "model", page.id);
      await mkdir(target); await writeFile(path.join(target, "index.html"), page.html, "utf8");
    }
    for (const page of listingPages) {
      const target = path.join(stage, page.id);
      await mkdir(target); await writeFile(path.join(target, "index.html"), page.html, "utf8");
    }
    let previous = [];
    try { previous = JSON.parse(await readFile(path.join(root, ".seo-pages.json"), "utf8")).listings || []; } catch { /* First generation. */ }
    await removeChild(path.join(root, "model"));
    await rename(path.join(stage, "model"), path.join(root, "model"));
    for (const id of previous.filter(id => !listingPages.some(page => page.id === id))) {
      safeId(id);
      if (["admin", "reset-password", "search", "model", "assets", "images"].includes(id)) throw Error("Unsafe previous listing ID");
      await removeChild(path.join(root, id));
    }
    for (const page of listingPages) {
      await removeChild(path.join(root, page.id));
      await rename(path.join(stage, page.id), path.join(root, page.id));
    }
    await writeFile(path.join(root, "sitemap.xml"), sitemap, "utf8");
    await writeFile(path.join(root, "robots.txt"), robots, "utf8");
    await writeFile(path.join(root, ".seo-pages.json"), JSON.stringify({ listings: listingPages.map(page => page.id) }), "utf8");
    return { models: modelPages.length, listings: listingPages.length };
  } finally { await removeChild(stage); }
}
