// Read-only Supabase snapshot -> static model/category landings + sitemap/robots.
// Fail closed: CI must not publish a build with missing or stale SEO pages.
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeCatalogSnapshot } from "./catalog-output.mjs";
import { importTS } from "./import-ts.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const distDir = path.join(root, "dist");
const { MODEL_COLUMNS, rowToModel } = await importTS(path.join(root, "src/lib/modelRecord.ts"));
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

async function main() {
  const template = await readFile(path.join(distDir, "index.html"), "utf8");
  const [rows, categories] = await Promise.all([
    readAll("models", MODEL_COLUMNS),
    readAll("categories", "id,label,description"),
  ]);
  const models = rows.map(rowToModel);
  const result = await writeCatalogSnapshot({ distDir, template, models, categories });
  console.log(`SEO: generated ${result.models} model landings, ${result.listings} listing pages, sitemap.xml and robots.txt from real data.`);
}

main().catch((error) => {
  console.error("SEO generation failed; build rejected to prevent publishing incomplete metadata.", error);
  process.exitCode = 1;
});
