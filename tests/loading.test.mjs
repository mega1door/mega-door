import assert from "node:assert/strict";
import { test } from "node:test";
import { importTS } from "../scripts/import-ts.mjs";
const { createRemoteCollection } = await importTS("src/lib/remoteCollection.ts");

test("starts empty/loading, resolves only real rows, distinguishes empty success", async () => {
  let resolve;
  const store = createRemoteCollection(() => new Promise((done) => { resolve = done; }));
  assert.deepEqual(store.getSnapshot(), { items: [], status: "loading" });
  const pending = store.refresh();
  assert.equal(store.getSnapshot().status, "loading");
  resolve([{ id: "real" }]);
  await pending;
  assert.deepEqual(store.getSnapshot(), { items: [{ id: "real" }], status: "ready" });
  const empty = createRemoteCollection(async () => []);
  await empty.refresh();
  assert.deepEqual(empty.getSnapshot(), { items: [], status: "ready" });
});

test("failed reads do not insert demo records, retry recovers, requests are deduplicated", async () => {
  let calls = 0;
  const store = createRemoteCollection(async () => {
    calls++;
    if (calls === 1) throw new Error("offline");
    return [{ id: "real" }];
  });
  let updates = 0;
  const unsubscribe = store.subscribe(() => updates++);
  await Promise.all([store.refresh(), store.refresh()]);
  assert.equal(calls, 1);
  assert.deepEqual(store.getSnapshot(), { items: [], status: "error" });
  await store.refresh();
  assert.equal(store.getSnapshot().status, "ready");
  assert.ok(updates >= 3);
  unsubscribe();
});
