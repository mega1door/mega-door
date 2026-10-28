// Read-only Supabase snapshot -> static model/category landings + sitemap/robots.
// Fail closed: CI must not publish a build with missing or stale SEO pages.
import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderModelPage, renderLanding, renderSitemap, renderRobots, escapeHtml } from "./seo-pages.mjs";
import { importTS } from "./import-ts.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const distDir = path.join(root, "dist");
const { absoluteSiteUrl, canonicalPageUrl } = await importTS(path.join(root, "src/lib/catalogMetadata.ts"));
const supabase = createClient("https://ecyxhlkkvjhensgymgdw.supabase.co", "sb_publishable_GrybiRkE_gvw_a5y0-jDVg_CqD82ivD", {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15000) }) },
});

async function readAll(table, columns) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from(table).select(columns).order("id").range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}

async function writePage(segments, html) {
  for (const segment of segments) {
    if (!segment || segment === "." || segment === ".." || /[\\/\u0000]/.test(segment)) throw new Error("Invalid page ID");
  }
  const directory = path.join(distDir, ...segments);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), html, "utf8");
}

async function main() {
  const template = await readFile(path.join(distDir, "index.html"), "utf8");
  const [rows, categories] = await Promise.all([
    readAll("models", "id,model_number,name,category,material,color,dimensions,specs,usage,images,is_popular"),
    readAll("categories", "id,label,description"),
  ]);
  const models = rows.map((row) => ({ ...row, modelNumber: row.model_number, images: row.images || [], isPopular: row.is_popular }));
  const labelById = new Map(categories.map((category) => [category.id, category.label]));
  for (const model of models) {
    await writePage(["model", model.id], renderModelPage(template, model, labelById.get(model.category) || ""));
  }
  // Real HTML for public listing URLs, so sitemap links do not rely on the SPA 404 fallback.
  const listings = [
    ...categories.filter((category) => models.some((model) => model.category === category.id)).map((category) => ({ id: category.id, title: category.label, description: category.description || category.label, models: models.filter((model) => model.category === category.id) })),
    { id: "popular", title: "الأكثر طلباً", description: "موديلات ميكا للأبواب المختارة ضمن الأكثر طلباً.", models: models.filter((model) => model.isPopular) },
  ];
  for (const listing of listings) {
    if (["admin", "reset-password", "search", "model"].includes(listing.id)) throw new Error("Reserved category ID");
    const metadata = { title: `${listing.title} | ميكا للأبواب`, description: listing.description, canonical: canonicalPageUrl(`/${encodeURIComponent(listing.id)}`), image: absoluteSiteUrl("/images/brand/mega-door-logo.png") };
    const content = `<main class="mx-auto max-w-content px-4 py-14"><h1>${escapeHtml(listing.title)}</h1><p>${escapeHtml(listing.description)}</p><ul>${listing.models.map((model) => `<li><a href="${canonicalPageUrl(`/model/${encodeURIComponent(model.id)}`)}">${escapeHtml(model.name)} — ${escapeHtml(model.modelNumber)}</a></li>`).join("")}</ul></main>`;
    await writePage([listing.id], renderLanding(template, metadata, content));
  }
  await writeFile(path.join(distDir, "sitemap.xml"), renderSitemap(models, categories), "utf8");
  await writeFile(path.join(distDir, "robots.txt"), renderRobots(), "utf8");
  console.log(`SEO: generated ${models.length} model landings, ${listings.length} listing pages, sitemap.xml and robots.txt from real data.`);
}

main().catch((error) => {
  console.error("SEO generation failed; build rejected to prevent publishing incomplete metadata.", error);
  process.exitCode = 1;
});
