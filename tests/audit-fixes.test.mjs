import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isolatedModule } from "./helpers/isolated-module.mjs";
import { componentHarness, nodes, text } from "./helpers/component-harness.mjs";
import { importTS } from "../scripts/import-ts.mjs";
import { renderModelPage } from "../scripts/seo-pages.mjs";
import { models, categories } from "./fixtures/catalog.mjs";
const records = await importTS("src/lib/modelRecord.ts");
const remote = await importTS("src/lib/remoteCollection.ts");
const metadata = await importTS("src/lib/catalogMetadata.ts");
const identity = await importTS("src/lib/doorIdentity.ts");
const imageUrl = await importTS("src/lib/imageUrl.ts");
const { searchModels } = await importTS("src/lib/search.ts");

function database(failure) {
  const rows = []; let inserts = 0, failed = false, blockLookup = false;
  return { rows, from() { return {
    select() { return { order: async () => ({ data: structuredClone(rows), error: null }), eq: (_, id) => ({ maybeSingle: async () => {
      if (blockLookup) { blockLookup = false; return { data: null, error: Error("Isolated read timeout") }; }
      return { data: structuredClone(rows.find(r => r.id === id) || null), error: null };
    } }) }; },
    async insert(row) {
      inserts++;
      if (rows.some(r => r.id === row.id)) return { error: { code: "23505" } };
      if (!failed && inserts === 3 && failure) {
        failed = true;
        if (failure === "lost-response") { rows.push(structuredClone(row)); blockLookup = true; }
        return { error: Error("Isolated third-insert timeout") };
      }
      rows.push(structuredClone(row)); return { error: null };
    },
    update(patch) { return { eq: async (_, id) => { Object.assign(rows.find(r => r.id === id), patch); return { error: null }; } }; },
  }; } };
}

async function storeFor(db) {
  const store = await isolatedModule("src/lib/modelsStore.ts", {
    react: { useSyncExternalStore: (_, snapshot) => snapshot() }, "./supabaseClient": { supabase: db },
    "./remoteCollection": remote, "./modelRecord": records,
  });
  await store.refreshModels(); return store;
}

async function bulkCase(failure, existing = false, doubleSubmit = false) {
  const db = database(failure);
  if (existing) db.rows.push({ ...records.modelToRow(models[0]), id: "existing", model_number: "0002-1" });
  const store = await storeFor(db), harness = componentHarness();
  let uploads = 0, completed = 0;
  const form = await isolatedModule("src/components/admin/BulkModelForm.tsx", {
    react: harness.hooks, "react/jsx-runtime": harness.jsxRuntime, "../../lib/modelsStore": store,
    "../../lib/categoriesStore": { useCategories: () => categories }, "../../lib/specTemplatesStore": { useSpecTemplates: () => [] },
    "../../lib/imageUpload": { uploadImage: async () => `/isolated/${++uploads}.webp` },
  }, { crypto: { randomUUID }, URL: { createObjectURL: file => `blob:${file.name}`, revokeObjectURL() {} }, console: { error() {} } });
  let tree; const render = () => tree = harness.render(form.default, { onDone: n => { completed = n; }, onCancel() {} });
  render(); render();
  nodes(tree, n => n.type === "input" && n.props.type === "file")[0].props.onChange({ target: { files: models.map((_, i) => ({ name: `${i}.png`, type: "image/png" })) } });
  render();
  nodes(tree, n => n.type === "input" && n.props.placeholder === "مثال: A5")[0].props.onChange({ target: { value: "0002" } });
  const label = nodes(tree, n => n.type === "label").find(n => text(n).includes("الاسم المشترك"));
  nodes(label, n => n.type === "input")[0].props.onChange({ target: { value: "مجموعة اختبار" } });
  render();
  nodes(tree, n => n.type === "input" && n.props.placeholder === "لون الباب").forEach((input, i) => input.props.onChange({ target: { value: models[i].color } }));
  // Optional color codes stay text, including leading zeros.
  nodes(tree, n => n.type === "input" && n.props.name === "color_code").forEach((input, i) => input.props.onChange({ target: { value: `00${205 + i}` } }));
  render();
  const submit = () => tree.props.onSubmit({ preventDefault() {} });
  if (doubleSubmit) await Promise.all([submit(), submit()]); else await submit();
  render();
  if (failure) {
    assert.equal(nodes(tree, n => n.type === "input" && n.props.placeholder === "لون الباب").length, 5);
    await tree.props.onSubmit({ preventDefault() {} }); render();
  }
  assert.equal(completed, 7);
  assert.equal(db.rows.length, existing ? 8 : 7);
  assert.equal(new Set(db.rows.map(r => r.id)).size, db.rows.length);
  assert.equal(new Set(db.rows.map(r => r.model_number)).size, db.rows.length);
  assert.equal(uploads, 7, "retry must reuse an already uploaded image");
  return { db, store };
}

for (const failure of ["before-save", "lost-response"]) test(`AC1 bulk partial failure and retry: ${failure}, no duplicate codes or records`, async () => { await bulkCase(failure, true); });

test("AC1 rapid double submit saves the seven doors once", async () => { await bulkCase(undefined, false, true); });

test("AC1 recovery accepts only the same saved payload and never overwrites a different record", async () => {
  const db = database(), store = await storeFor(db);
  await store.addModel(models[1], { id: "stable-batch-item" });
  await store.addModel(models[1], { id: "stable-batch-item" });
  await assert.rejects(store.addModel({ ...models[1], color: "different" }, { id: "stable-batch-item" }));
  assert.equal(db.rows.length, 1); assert.equal(db.rows[0].color, models[1].color);
});

test("AC2 bulk color_code is persisted/read/searchable with leading zeros", async () => {
  const { db, store } = await bulkCase();
  for (const [i, row] of db.rows.entries()) {
    assert.equal(row.color_code, `00${205 + i}`);
    assert.deepEqual(searchModels(store.getModelsSnapshot(), row.color_code, categories).map(m => m.id), [row.id]);
  }
  assert.deepEqual(searchModels(store.getModelsSnapshot(), "٠٠٢٠٥", categories).map(m => m.id), [db.rows[0].id]);
});

test("AC2 single create/edit/clear color_code uses the real form and real record/store mapping", async () => {
  const db = database(), store = await storeFor(db);
  for (const code of ["", "00205", "000301", ""]) {
    const harness = componentHarness();
    const form = await isolatedModule("src/components/admin/ModelForm.tsx", {
      react: harness.hooks, "react/jsx-runtime": harness.jsxRuntime,
      "../../lib/categoriesStore": { useCategories: () => categories }, "../../lib/specTemplatesStore": { useSpecTemplates: () => [] }, "./ImageUploader": { default: "image-uploader" },
    });
    const initial = store.getModelsSnapshot()[0];
    const props = { initial, onCancel() {}, onSubmit: async values => initial ? store.updateModel(initial.id, values) : store.addModel(values) };
    let tree = harness.render(form.default, props);
    if (!initial) nodes(tree, n => n.type === "input" && n.props.placeholder === "مثال: MD-105")[0].props.onChange({ target: { value: "0002" } });
    const input = nodes(tree, n => n.type === "input" && n.props.name === "color_code")[0];
    assert.ok(input, "optional color-code field exists"); assert.equal(input.props.type, "text");
    assert.equal(input.props.required, undefined);
    if (initial) assert.equal(input.props.value, initial.colorCode ?? "");
    input.props.onChange({ target: { value: code } });
    tree = harness.render(form.default, props); await tree.props.onSubmit({ preventDefault() {} });
    assert.equal(db.rows[0].color_code, code || null);
    assert.equal(store.getModelsSnapshot()[0].colorCode, code || undefined);
    if (code) assert.equal(searchModels(store.getModelsSnapshot(), code, categories).length, 1);
  }
});

test("AC3 carousel initially loads one full original image; all navigation paths and reset work", async () => {
  const harness = componentHarness();
  const carousel = await isolatedModule("src/components/SwipeCarousel.tsx", { react: harness.hooks, "react/jsx-runtime": harness.jsxRuntime }, { window: { addEventListener() {}, removeEventListener() {} } });
  const originals = models.map((_, i) => `/original-${i}.webp`);
  let index = 0;
  const props = () => ({ images: originals, index, onIndexChange: i => { index = i; }, resetKey: "first", getAlt: i => `باب ${i}`, className: "original-layout" });
  let tree = harness.render(carousel.default, props());
  const sources = () => nodes(tree, n => n.type === "img" && n.props.src).map(n => n.props.src);
  assert.deepEqual(sources(), [originals[0]]);
  nodes(tree, n => n.type === "button" && n.props["aria-label"] === "الصورة التالية")[0].props.onClick();
  tree = harness.render(carousel.default, props()); assert.equal(index, 1); assert.ok(sources().includes(originals[1])); assert.ok(sources().length < 7);
  nodes(tree, n => n.props["data-swipe-gallery"] !== undefined)[0].props.onPointerDown();
  tree = harness.render(carousel.default, props());
  assert.ok(sources().includes(originals[2]), "adjacent original is prepared when a swipe begins");
  assert.ok(sources().length < 7);
  for (index = 2; index < 7; index++) tree = harness.render(carousel.default, props());
  index = 0; tree = harness.render(carousel.default, props()); assert.deepEqual(new Set(sources()), new Set(originals));
  tree = harness.render(carousel.default, { ...props(), resetKey: "second", images: ["/other-original.webp"] });
  assert.deepEqual(sources(), ["/other-original.webp"]);
});

test("AC3 actual SEO HTML loads only the first image with JS, retains all Product images and no-JS fallback", async () => {
  const model = { ...models[1], images: models.map((_, i) => `/original-${i}.webp`) };
  const html = renderModelPage(await readFile("index.html", "utf8"), model, categories[0].label);
  const activeHtml = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, "");
  assert.equal([...activeHtml.matchAll(/<img\b/g)].length, 1);
  const product = JSON.parse(html.match(/id="model-product-schema"[^>]*>(.*?)<\/script>/s)[1]);
  assert.equal(product.image.length, 7);
  assert.equal([...html.matchAll(/<img\b/g)].length, 7);
});

test("AC4 desktop menu exposes search while the existing mobile search link remains", async () => {
  const harness = componentHarness();
  const header = await isolatedModule("src/components/Header.tsx", {
    react: harness.hooks, "react/jsx-runtime": harness.jsxRuntime, "react-router-dom": { Link: "Link", NavLink: "NavLink" },
    "../lib/categoriesStore": { useCategories: () => categories }, "./ContactAccordions": { default: "contact" },
  });
  let tree = harness.render(header.default);
  assert.equal(nodes(tree, n => n.type === "Link" && n.props.to === "/search").length, 1);
  nodes(tree, n => n.type === "button" && n.props["aria-label"] === "فتح القائمة")[0].props.onClick();
  tree = harness.render(header.default);
  assert.equal(nodes(tree, n => n.type === "NavLink" && n.props.to === "/search").length, 1);
});

test("AC5 each mobile/desktop card text includes the model code exactly once", async () => {
  const card = await isolatedModule("src/components/ProductCard.tsx", {
    "react/jsx-runtime": componentHarness().jsxRuntime, "react-router-dom": { Link: "Link" },
    "../lib/categoriesStore": { useCategories: () => categories }, "../lib/catalogMetadata": metadata, "../lib/doorIdentity": identity, "../lib/imageUrl": imageUrl,
  });
  const tree = card.default({ model: models[1] });
  const mobile = nodes(tree, n => n.type === "div" && n.props.className?.includes("flex-1 flex-col"))[0];
  // Both screen sizes now use the mobile card; archived desktop markup stays hidden.
  const desktop = nodes(tree, n => n.type === "div" && n.props.className?.trim() === "hidden p-5")[0];
  for (const view of [mobile, desktop]) { assert.equal(text(view).split("0002").length - 1, 1); assert.ok(text(view).includes("جوزي")); }
});
