import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importTS } from "./import-ts.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const { SITE_BASE } = await importTS(path.join(root, "src/lib/catalogMetadata.ts"));
const dist = path.join(root, "dist");
const sitemap = await readFile(path.join(dist, "sitemap.xml"), "utf8");
assert.doesNotMatch(sitemap, /megadoor\.iq|\/model\/md-10[5-9]|\/model\/md-110/);
const links = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
assert.ok(links.includes(`${SITE_BASE}/`));
for (const link of links) {
  assert.ok(link.startsWith(`${SITE_BASE}/`) && link.endsWith("/"), link);
  const relative = decodeURIComponent(link.slice(SITE_BASE.length));
  const html = await readFile(path.join(dist, relative, "index.html"), "utf8");
  assert.ok(html.includes(`<link rel="canonical" href="${link}"`), link);
  if (relative.startsWith("/model/")) {
    assert.match(html, /<h1/);
    const scripts = [...html.matchAll(/id="model-product-schema"[^>]*>(.*?)<\/script>/gs)];
    assert.equal(scripts.length, 1, link);
    assert.equal(JSON.parse(scripts[0][1])["@type"], "Product");
  }
}
const robots = await readFile(path.join(dist, "robots.txt"), "utf8");
assert.ok(robots.includes(`Sitemap: ${SITE_BASE}/sitemap.xml`));
console.log(`PASS: ${links.length} built sitemap URLs have real HTML and matching production canonicals; all model pages include Product JSON-LD.`);
