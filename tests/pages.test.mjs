import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { renderModelPage, renderSitemap, renderRobots } from "../scripts/seo-pages.mjs";
const template = await readFile("index.html", "utf8");
const model = { id: "real-a1", name: 'باب <أبيض> "خاص"', modelNumber: "A1", category: "interior", color: "أبيض 9010", images: ["https://example.test/real.jpg"], isPopular: false };

test("model landing has crawlable real content, escaped metadata and Product JSON", () => {
  const html = renderModelPage(template, model, "الأبواب الداخلية");
  assert.match(html, /<h1[^>]*>باب &lt;أبيض&gt; &quot;خاص&quot;<\/h1>/);
  assert.match(html, /model\/real-a1/);
  assert.match(html, /og:image" content="https:\/\/example.test\/real.jpg/);
  assert.match(html, /id="model-product-schema"/);
  assert.doesNotMatch(html, /<أبيض>/);
  const json = html.match(/id="model-product-schema"[^>]*>(.*?)<\/script>/s)[1];
  assert.equal(JSON.parse(json).name, model.name);
  assert.equal(JSON.parse(json).offers, undefined);
});

test("sitemap/robots include only production, actual models and occupied categories", () => {
  const sitemap = renderSitemap([model, { ...model, id: "real-no-image", images: [] }], [{ id: "interior" }, { id: "empty" }]);
  assert.match(sitemap, /mega1door.github.io\/mega-door\/model\/real-a1/);
  assert.match(sitemap, /real-no-image/);
  assert.doesNotMatch(sitemap, /megadoor\.iq|md-105|\/empty|\/search|\/admin/);
  assert.match(renderRobots(), /Disallow: \/mega-door\/admin/);
  assert.match(renderRobots(), /Sitemap: https:\/\/mega1door.github.io\/mega-door\/sitemap.xml/);
});

test("model without image still has a landing page and logo share fallback", () => {
  const html = renderModelPage(template, { ...model, images: [] }, "");
  assert.match(html, /mega-door-logo.png/);
  assert.match(html, /<h1/);
  assert.doesNotMatch(html, /src="undefined"/);
});
