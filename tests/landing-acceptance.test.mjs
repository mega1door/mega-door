import assert from "node:assert/strict";
import { test } from "node:test";
import http from "node:http";
import path from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { writeCatalogSnapshot } from "../scripts/catalog-output.mjs";
import { importTS } from "../scripts/import-ts.mjs";
import { models, categories } from "./fixtures/catalog.mjs";
const { SITE_BASE, modelMetadata } = await importTS("src/lib/catalogMetadata.ts");
const { searchModels } = await importTS("src/lib/search.ts");
const template = await readFile("dist/index.html", "utf8"); // Real Vite output is required.

test("AC-04/05 seven actual generated pages: direct GET, refresh, unique HTML metadata and working images", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mega-acceptance-landings-"));
  let server;
  try {
    await writeCatalogSnapshot({ distDir: root, template, models, categories });
    server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, "http://localhost");
        assert.equal(req.method, "GET");
        assert.ok(url.pathname.startsWith("/mega-door/"));
        if (url.pathname.includes("/test-assets/")) { res.setHeader("Content-Type", "image/svg+xml"); res.end('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="20"><rect width="10" height="20" fill="#0034B8"/></svg>'); return; }
        const relative = decodeURIComponent(url.pathname.slice("/mega-door/".length));
        assert.ok(!relative.split("/").includes(".."));
        const file = relative.endsWith("/") || !relative ? relative + "index.html" : relative;
        const target = path.join(root, file);
        let content;
        try { content = await readFile(target); } catch { content = await readFile(path.join("dist", file)); }
        res.end(content);
      } catch { res.statusCode = 404; res.end("Not found"); }
    }).listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const titles = new Set(), canonicals = new Set();
    for (const model of models) {
      const meta = modelMetadata(model, categories[0].label);
      const route = meta.canonical.slice(new URL(SITE_BASE).origin.length);
      for (let refresh = 0; refresh < 2; refresh++) {
        const response = await fetch(base + route);
        assert.equal(response.status, 200);
        const html = await response.text();
        assert.ok(html.includes(`<title>${meta.title}</title>`));
        assert.ok(html.includes(`<h1 class="font-display text-3xl font-extrabold text-ink">${meta.name}</h1>`));
        assert.ok(html.includes(`<link rel="canonical" href="${meta.canonical}"`));
        for (const [key, value] of Object.entries({ title: meta.title, description: meta.description, image: meta.image, url: meta.canonical })) {
          assert.ok(html.includes(`<meta property="og:${key}" content="${value}"`), key);
        }
        assert.ok(html.includes(`name="description" content="${meta.description}"`));
        assert.ok(html.includes(`alt="${meta.alt} — صورة 1"`));
        assert.doesNotMatch(html, /noindex/);
        const product = JSON.parse(html.match(/id="model-product-schema"[^>]*>(.*?)<\/script>/s)[1]);
        assert.equal(product.name, meta.name); assert.equal(product.sku, model.modelNumber);
        assert.equal(product.color, model.color);
        assert.equal(product.additionalProperty.find(p => p.name === "كود اللون").value, model.colorCode);
        assert.equal(product.image[0], meta.image);
        assert.equal(product.offers, undefined);
        for (const other of models.filter(m => m.id !== model.id)) assert.ok(!html.includes(`/model/${other.id}/`));
        const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
        for (const asset of assets.filter(a => a.startsWith("/mega-door/") || a.startsWith(SITE_BASE))) {
          const route = asset.startsWith(SITE_BASE) ? asset.slice(new URL(SITE_BASE).origin.length) : asset;
          const assetResponse = await fetch(base + route);
          assert.equal(assetResponse.status, 200, asset);
          await assetResponse.arrayBuffer();
        }
      }
      titles.add(meta.title); canonicals.add(meta.canonical);
    }
    assert.equal(titles.size, 7); assert.equal(canonicals.size, 7);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    assert.ok(path.dirname(root) === path.resolve(tmpdir()) && path.basename(root).startsWith("mega-acceptance-"));
    await rm(root, { recursive: true, force: true });
  }
});

test("AC-06 next generation updates color/specs, adds new models, removes stale model pages and sitemap entries", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mega-acceptance-refresh-"));
  try {
    await writeCatalogSnapshot({ distDir: root, template, models, categories });
    const changed = models.slice(1).map((model, i) => i === 0 ? { ...model, color: "جوزي معدل", specs: ["مواصفة محدثة مؤكدة"] } : model);
    changed.push({ ...models[0], id: "test-new-0008", modelNumber: "0008", color: "أخضر" });
    await writeCatalogSnapshot({ distDir: root, template, models: changed, categories });
    const xml = await readFile(path.join(root, "sitemap.xml"), "utf8");
    assert.ok(xml.includes("test-new-0008")); assert.ok(!xml.includes(models[0].id));
    await assert.rejects(readFile(path.join(root, "model", models[0].id, "index.html")), { code: "ENOENT" });
    const html = await readFile(path.join(root, "model", models[1].id, "index.html"), "utf8");
    assert.match(html, /جوزي معدل/); assert.match(html, /مواصفة محدثة مؤكدة/);
    assert.deepEqual(searchModels(changed, "جوزي معدل", categories).map(m => m.id), [models[1].id]);
    await assert.rejects(writeCatalogSnapshot({ distDir: root, template, models: [...changed, changed[0]], categories }), /Duplicate model ID/);
    assert.equal(await readFile(path.join(root, "sitemap.xml"), "utf8"), xml);
  } finally {
    assert.ok(path.dirname(root) === path.resolve(tmpdir()) && path.basename(root).startsWith("mega-acceptance-"));
    await rm(root, { recursive: true, force: true });
  }
});
