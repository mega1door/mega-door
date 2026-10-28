import assert from "node:assert/strict";
import { test } from "node:test";
import { importTS } from "../scripts/import-ts.mjs";

const { searchModels } = await importTS("src/lib/search.ts");
const { SITE_BASE, absoluteSiteUrl, modelMetadata } = await importTS("src/lib/catalogMetadata.ts");
const model = { id: "a-1", name: "باب أنيق", modelNumber: "A-1", category: "interior", color: "أبيض RAL-9010", images: ["/mega-door/images/door.jpg"], isPopular: false };
const categories = [{ id: "interior", label: "الأبواب الداخلية" }];

test("Arabic, digits, model/color codes and category labels can be combined", () => {
  for (const query of ["ابيض", "أَبْيَض", "RAL ٩٠١٠", "RAL9010", "a١", "داخلية ابيض A-1", "interior"]) {
    assert.equal(searchModels([model], query, categories).length, 1, query);
  }
  assert.equal(searchModels([model], "خارجي", categories).length, 0);
  assert.equal(searchModels([model], "  ", categories).length, 0);
});

test("production URLs preserve base path exactly once", () => {
  assert.equal(SITE_BASE, "https://mega1door.github.io/mega-door");
  for (const path of ["/images/door.jpg", "/mega-door/images/door.jpg", "images/door.jpg"]) {
    assert.equal(absoluteSiteUrl(path), `${SITE_BASE}/images/door.jpg`);
  }
  assert.equal(absoluteSiteUrl("https://example.test/photo.jpg"), "https://example.test/photo.jpg");
  assert.throws(() => absoluteSiteUrl("javascript:alert(1)"));
});

test("metadata uses only real fields and does not invent price/specifications", () => {
  const meta = modelMetadata(model, categories[0].label);
  assert.match(meta.title, /A-1/);
  assert.match(meta.description, /أبيض RAL-9010/);
  assert.match(meta.description, /الأبواب الداخلية/);
  assert.equal(meta.image, `${SITE_BASE}/images/door.jpg`);
  assert.match(meta.alt, /باب داخلي/);
  assert.doesNotMatch(meta.alt, /أنيق/);
  assert.match(meta.alt, /أبيض/);
  assert.equal(meta.canonical, `${SITE_BASE}/model/a-1/`);
  assert.equal(meta.product.offers, undefined);
  assert.equal(meta.product.material, undefined);
  assert.doesNotMatch(JSON.stringify(meta), /ضمان|مقاوم|سعر/);
  const noImage = modelMetadata({ ...model, images: [], color: undefined });
  assert.match(noImage.image, /mega-door-logo/);
  assert.equal(noImage.product.image, undefined);
});
