import assert from "node:assert/strict";
import { test } from "node:test";
import { importTS } from "../scripts/import-ts.mjs";
import { models, categories } from "./fixtures/catalog.mjs";
const { doorName } = await importTS("src/lib/doorIdentity.ts");
const { modelMetadata } = await importTS("src/lib/catalogMetadata.ts");
const { searchModels } = await importTS("src/lib/search.ts");

test("AC-01 exact automatic name, real fields only, leading zeros retained", () => {
  assert.equal(doorName(models[1], categories[0].label), "باب داخلي HDF لون جوزي – موديل 0002");
  const minimal = { ...models[1], category: "unknown", material: undefined, color: undefined, colorCode: undefined };
  assert.equal(doorName(minimal), "باب – موديل 0002");
  assert.equal(doorName({ ...minimal, modelNumber: "" }), "باب");
  assert.equal(doorName({ ...minimal, category: "exterior" }), "باب خارجي – موديل 0002");
  assert.equal(doorName({ ...models[1], category: "custom-id" }, categories[0].label), "باب داخلي HDF لون جوزي – موديل 0002");
  assert.equal(modelMetadata({ ...models[0], colorCode: "000205" }, categories[0].label).product.additionalProperty.find(p => p.name === "كود اللون").value, "000205");
});

test("AC-03 model/color codes, color names, compound Arabic/material search", () => {
  for (const query of ["0002", "205", "جوزي", "باب داخلي جوزي", "HDF جوزي", "  HDF    جوزي  ", "٠٠٠٢", "٢٠٥", "۲۰۵", "بَاب دَاخِلِي جوزي"]) {
    assert.deepEqual(searchModels(models, query, categories).map(m => m.id), [models[1].id], query);
  }
  for (const query of ["ابيض", "إبيض", "آبيض", "أَبْيَض"]) {
    assert.deepEqual(searchModels(models, query, categories).map(m => m.id), [models[0].id], query);
  }
  assert.equal(searchModels(models, "باب خارجي جوزي", categories).length, 0);
  assert.equal(searchModels(models, "HDF وردي", categories).length, 0);
  assert.equal(searchModels([{ ...models[1], modelNumber: "00020", colorCode: "1205", color: "أسود" }], "205", categories).length, 0);
  assert.equal(searchModels(models, "  ", categories).length, 0);
});

test("AC-05/06 metadata updates from current color/specs without changing original stored records", () => {
  const before = structuredClone(models[1]);
  const first = modelMetadata(before, categories[0].label);
  const edited = { ...before, color: "رمادي مؤكد", specs: ["مواصفة معدلة مؤكدة"] };
  const second = modelMetadata(edited, categories[0].label);
  assert.equal(first.name, "باب داخلي HDF لون جوزي – موديل 0002");
  assert.notEqual(first.title, second.title);
  assert.match(second.description, /رمادي مؤكد/);
  assert.match(second.description, /مواصفة معدلة مؤكدة/);
  assert.match(second.alt, /رمادي مؤكد/);
  assert.equal(first.canonical, second.canonical);
  assert.equal(before.name, models[1].name);
  assert.equal(first.product.offers, undefined);
  assert.doesNotMatch(JSON.stringify(second), /ضمان|مقاوم|سعر/);
});
