import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { importTS } from "../scripts/import-ts.mjs";
import { isolatedModule } from "./helpers/isolated-module.mjs";
import { categories, models as fixtures } from "./fixtures/catalog.mjs";
const records = await importTS("src/lib/modelRecord.ts");
const remote = await importTS("src/lib/remoteCollection.ts");
const { modelMetadata } = await importTS("src/lib/catalogMetadata.ts");

function testDatabase() {
  const rows = [];
  const writes = [];
  return { rows, writes, from(table) {
    assert.equal(table, "models");
    return {
      select(columns) { assert.ok(columns.includes("color_code")); return { order: async () => ({ data: structuredClone(rows), error: null }) }; },
      async insert(row) { assert.ok(!rows.some(r => r.id === row.id)); rows.push(structuredClone(row)); writes.push(structuredClone(row)); return { error: null }; },
      update(patch) { return { eq: async (_, id) => { Object.assign(rows.find(r => r.id === id), patch); return { error: null }; } }; },
      delete() { return { eq: async (_, id) => { rows.splice(rows.findIndex(r => r.id === id), 1); return { error: null }; } }; },
    };
  } };
}

async function realStore(database) {
  const store = await isolatedModule("src/lib/modelsStore.ts", {
    react: { useSyncExternalStore: (_, snapshot) => snapshot() },
    "./supabaseClient": { supabase: database },
    "./remoteCollection": remote,
    "./modelRecord": records,
  });
  await store.refreshModels();
  return store;
}

test("AC-02 bulk form creates seven independent records via the real addModel path", async () => {
  const database = testDatabase();
  const store = await realStore(database);
  const slots = [], refs = [];
  let stateIndex = 0, refIndex = 0, uploads = 0, completed = 0;
  const hooks = {
    useState(initial) { const index = stateIndex++; if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = refIndex++; return refs[index] ||= { current: initial }; },
    useEffect(callback) { callback(); },
  };
  const jsx = (type, props) => ({ type, props: props || {} });
  const form = await isolatedModule("src/components/admin/BulkModelForm.tsx", {
    react: hooks, "react/jsx-runtime": { jsx, jsxs: jsx },
    "../../lib/modelsStore": store,
    "../../lib/categoriesStore": { useCategories: () => categories },
    "../../lib/specTemplatesStore": { useSpecTemplates: () => [{ id: "shared", name: "قالب اختبار", material: "HDF", specs: ["مواصفة اختبار مشتركة مؤكدة"], usage: "استخدام اختبار" }] },
    "../../lib/imageUpload": { uploadImage: async () => `/test-assets/bulk-${++uploads}.svg` },
  }, { crypto: { randomUUID }, URL: { createObjectURL: file => `blob:isolated-${file.name}`, revokeObjectURL() {} } });
  let tree;
  function render() { stateIndex = refIndex = 0; tree = form.default({ onDone: count => { completed = count; }, onCancel() {} }); return tree; }
  function nodes(value, predicate, found = []) {
    if (Array.isArray(value)) value.forEach(child => nodes(child, predicate, found));
    else if (value && typeof value === "object") { if (predicate(value)) found.push(value); nodes(value.props?.children, predicate, found); }
    return found;
  }
  render(); render();
  const fileInput = nodes(tree, n => n.type === "input" && n.props.type === "file")[0];
  fileInput.props.onChange({ target: { files: fixtures.map((_, i) => ({ name: `door-${i}.png`, type: "image/png" })) } });
  render();
  const template = nodes(tree, n => n.type === "select" && n.props.defaultValue === "")[0];
  template.props.onChange({ target: { value: "shared" } });
  render();
  const code = nodes(tree, n => n.type === "input" && n.props.placeholder === "مثال: A5")[0];
  code.props.onChange({ target: { value: "0002" } });
  const labels = nodes(tree, n => n.type === "label");
  const nameLabel = labels.find(n => JSON.stringify(n.props.children).includes("الاسم المشترك"));
  const nameInput = nodes(nameLabel, n => n.type === "input")[0];
  nameInput.props.onChange({ target: { value: "مجموعة اختبار" } });
  render();
  const colorInputs = nodes(tree, n => n.type === "input" && n.props.placeholder === "لون الباب");
  assert.equal(colorInputs.length, 7);
  colorInputs.forEach((input, i) => input.props.onChange({ target: { value: fixtures[i].color } }));
  render();
  await tree.props.onSubmit({ preventDefault() {} });
  assert.equal(completed, 7);
  assert.equal(uploads, 7);
  assert.equal(database.writes.length, 7);
  assert.equal(new Set(database.rows.map(r => r.id)).size, 7);
  assert.equal(new Set(database.rows.map(r => r.model_number)).size, 7);
  assert.equal(new Set(database.rows.map(r => r.color)).size, 7);
  assert.ok(database.rows.every(r => r.model_number.startsWith("0002-")));
  assert.ok(database.rows.every(r => r.material === "HDF" && r.specs[0] === "مواصفة اختبار مشتركة مؤكدة"));
  const snapshots = store.getModelsSnapshot();
  assert.equal(new Set(snapshots.map(m => modelMetadata(m, categories[0].label).canonical)).size, 7);
});

test("AC-06 real store reads color_code, preserves zeros on update and does not rewrite other models", async () => {
  const database = testDatabase();
  database.rows.push({ id: "0002", model_number: "0002", name: "اسم محفوظ", category: "interior", color: "جوزي", color_code: "0205", material: "HDF", images: ["/test-assets/door.svg"], is_popular: false });
  const untouched = { ...database.rows[0], id: "unrelated", model_number: "0003", color: "أسود" };
  database.rows.push(structuredClone(untouched));
  const store = await realStore(database);
  const before = store.getModelsSnapshot()[0];
  assert.equal(before.colorCode, "0205");
  await store.updateModel(before.id, { ...before, color: "رمادي" });
  const after = store.getModelsSnapshot()[0];
  assert.equal(database.rows[0].color_code, "0205");
  assert.equal(after.modelNumber, "0002");
  assert.match(modelMetadata(after, categories[0].label).name, /رمادي/);
  await store.deleteModel(after.id);
  assert.equal(store.getModelsSnapshot().length, 1);
  assert.deepEqual(database.rows[0], untouched);
});
