import assert from "node:assert/strict";
import { test } from "node:test";
import { isolatedModule } from "./helpers/isolated-module.mjs";
import { importTS } from "../scripts/import-ts.mjs";
import { componentHarness, nodes, text } from "./helpers/component-harness.mjs";
import { randomUUID } from "node:crypto";
import { categories } from "./fixtures/catalog.mjs";
const { createAdminAccessController } = await importTS("src/lib/adminAccessController.ts");
const OWNER = { id: "4ece01b2-d222-4291-b404-60bff142177f", email: "owner@example.test", email_confirmed_at: "2026-01-01" };
const ALAA = { id: "second-admin", email: "alaa@example.test", email_confirmed_at: "2026-01-02" };
const flush = () => new Promise(resolve => setImmediate(resolve));

test("authorization is server-derived, fails closed, preserves two independent identities and clears on logout", async () => {
  let user = OWNER, serverRole = null, listener, rpcError = null;
  const tasks = [];
  const client = { auth: {
    getSession: async () => ({ data: { session: user ? { user } : null }, error: null }),
    onAuthStateChange(callback) { listener = callback; return { data: { subscription: { unsubscribe() {} } } }; },
  }, rpc: async () => ({ data: serverRole, error: rpcError }) };
  const access = createAdminAccessController(client, callback => tasks.push(callback));
  const settle = async () => { await flush(); tasks.splice(0).forEach(run => run()); await flush(); };
  access.start(); await settle();
  assert.equal(access.getSnapshot().status, "pending", "even the legacy owner UUID has no client-side bypass");
  serverRole = "owner"; await access.refresh(); await settle();
  assert.equal(access.getSnapshot().role, "owner");
  listener("SIGNED_OUT", null); assert.equal(access.getSnapshot().status, "signed-out");
  user = ALAA; serverRole = null; listener("SIGNED_IN", { user }); await settle();
  assert.equal(access.getSnapshot().status, "pending");
  serverRole = "admin"; await access.refresh(); await settle();
  assert.equal(access.getSnapshot().role, "admin"); assert.equal(access.getSnapshot().user.id, ALAA.id);
  user = { ...ALAA, email_confirmed_at: undefined }; listener("SIGNED_IN", { user }); await settle();
  assert.equal(access.getSnapshot().status, "pending", "confirmation is required even if the response is unexpected");
  user = OWNER; rpcError = Error("missing RPC or denied"); listener("SIGNED_IN", { user }); await settle();
  assert.equal(access.getSnapshot().status, "error"); assert.equal(access.getSnapshot().role, null);
});

test("a stale authorization response cannot re-open administration after sign-out", async () => {
  let listener, finish;
  const tasks = [];
  const access = createAdminAccessController({ auth: { getSession: async () => ({ data: { session: { user: OWNER } } }), onAuthStateChange(cb) { listener = cb; } },
    rpc: () => new Promise(resolve => { finish = resolve; }) }, callback => tasks.push(callback));
  access.start(); await flush(); tasks.splice(0).forEach(run => run()); await flush();
  listener("SIGNED_OUT", null); finish({ data: "owner", error: null }); await flush();
  assert.equal(access.getSnapshot().status, "signed-out"); assert.equal(access.getSnapshot().role, null);
});

test("registration and recovery use each person's own email; no role metadata or privileged API is sent", async () => {
  const calls = []; let backendReady = true;
  const auth = await isolatedModule("src/lib/adminAuth.ts", {
    "./supabaseClient": { supabase: { rpc: async () => ({ error: backendReady ? null : Error("Not installed") }), auth: {
      signUp: async payload => { calls.push(["signup", payload]); return { error: null }; },
      resetPasswordForEmail: async (...args) => { calls.push(["reset", ...args]); return { error: null }; },
      signOut: async args => { calls.push(["logout", args]); return { error: null }; },
    } } }, "./catalogMetadata": { canonicalPageUrl: path => `https://mega1door.github.io/mega-door${path}/` },
  });
  await auth.registerAdminCandidate(" alaa@example.test ", "isolated-password");
  await auth.requestAdminPasswordReset("alaa@example.test"); await auth.requestAdminPasswordReset("owner@example.test");
  await auth.signOutAdmin();
  assert.deepEqual(structuredClone(calls[0]), ["signup", { email: "alaa@example.test", password: "isolated-password", options: { emailRedirectTo: "https://mega1door.github.io/mega-door/admin/" } }]);
  assert.deepEqual(calls.filter(call => call[0] === "reset").map(call => call[1]), ["alaa@example.test", "owner@example.test"]);
  assert.equal(calls[1][2].redirectTo, "https://mega1door.github.io/mega-door/reset-password/");
  assert.deepEqual(structuredClone(calls.at(-1)), ["logout", { scope: "local" }]);
  backendReady = false;
  await assert.rejects(auth.registerAdminCandidate("not-created@example.test", "isolated-password"));
  assert.equal(calls.filter(call => call[0] === "signup").length, 1, "no account is created before the server protection is installed");
});

test("login gate hides all admin children for pending/error users and supports registration/recovery screens", async () => {
  let access = { status: "pending", role: null, user: ALAA };
  const harness = componentHarness(), calls = [];
  const gate = await isolatedModule("src/components/admin/AdminLoginGate.tsx", {
    "./DeleteOwnAccount": { default: "DeleteOwnAccount" },
    react: harness.hooks, "react/jsx-runtime": harness.jsxRuntime,
    "../../lib/adminAccess": { useAdminAccess: () => access, refreshAdminAccess() {} },
    "../../lib/supabaseClient": { supabase: { auth: { signInWithPassword: async args => { calls.push(args); return { error: null }; } } } },
    "../../lib/adminAuth": { ACCOUNT_MANAGEMENT_ENABLED: true, registerAdminCandidate: async (...args) => calls.push(["signup", ...args]), requestAdminPasswordReset: async email => calls.push(["reset", email]), signOutAdmin: async () => {} },
  });
  const render = () => harness.render(gate.default, { children: "PRIVATE_ADMIN_CONTENT" });
  assert.ok(!text(render()).includes("PRIVATE_ADMIN_CONTENT"));
  access = { ...access, status: "error" }; assert.ok(!text(render()).includes("PRIVATE_ADMIN_CONTENT"));
  access = { ...access, status: "authorized", role: "admin" }; assert.equal(text(render()), "PRIVATE_ADMIN_CONTENT");
  access = { status: "signed-out", role: null, user: null };
  let tree = render(); nodes(tree, n => n.type === "button" && text(n) === "إنشاء حساب")[0].props.onClick(); tree = render();
  nodes(tree, n => n.type === "input" && n.props.type === "email")[0].props.onChange({ target: { value: ALAA.email } });
  nodes(tree, n => n.type === "input" && n.props.type === "password").forEach(n => n.props.onChange({ target: { value: "isolated-password" } }));
  tree = render(); await nodes(tree, n => n.type === "form")[0].props.onSubmit({ preventDefault() {} }); tree = render();
  assert.ok(text(tree).includes("تأكيد البريد لا يمنح الإدارة")); assert.equal(calls[0][0], "signup");
  nodes(tree, n => n.type === "button" && text(n) === "نسيت كلمة المرور")[0].props.onClick(); tree = render();
  assert.equal(nodes(tree, n => n.type === "input" && n.props.type === "password").length, 0);
  await nodes(tree, n => n.type === "form")[0].props.onSubmit({ preventDefault() {} }); assert.deepEqual(calls.at(-1), ["reset", ALAA.email]);
});

test("selecting seven images immediately shows previews before shared specifications; no upload/save occurs until submit", async () => {
  const harness = componentHarness(); let writes = 0, uploads = 0; const revoked = [];
  const bulk = await isolatedModule("src/components/admin/BulkModelForm.tsx", {
    react: harness.hooks, "react/jsx-runtime": harness.jsxRuntime,
    "../../lib/modelsStore": { getModelsSnapshot: () => [], addModel: async () => { writes++; } },
    "../../lib/categoriesStore": { useCategories: () => categories }, "../../lib/specTemplatesStore": { useSpecTemplates: () => [] },
    "../../lib/imageUpload": { uploadImage: async () => { uploads++; return "/isolated.webp"; } },
  }, { crypto: { randomUUID }, URL: { createObjectURL: file => `blob:${file.name}`, revokeObjectURL: url => revoked.push(url) } });
  const render = () => harness.render(bulk.default, { onDone() {}, onCancel() {} });
  let tree = render(); tree = render();
  nodes(tree, n => n.type === "input" && n.props.type === "file")[0].props.onChange({ target: { files: Array.from({ length: 7 }, (_, i) => ({ name: `door-${i}`, type: "image/png" })) } });
  tree = render();
  const sections = nodes(tree, n => n.type === "section");
  assert.equal(nodes(sections[0], n => n.type === "input" && n.props.type === "file").length, 1);
  assert.equal(nodes(sections[1], n => n.type === "img").length, 7);
  assert.ok(text(sections[2]).includes("المعلومات المشتركة"));
  assert.equal(nodes(sections[1], n => n.type === "input" && n.props.name === "color_code").length, 7);
  assert.ok(text(sections[0]).includes("تم اختيار 7 صورة")); assert.ok(text(sections[0]).includes("لم تُحفظ"));
  assert.equal(uploads, 0); assert.equal(writes, 0);
  nodes(tree, n => n.type === "button" && n.props["aria-label"] === "إزالة الصورة 3")[0].props.onClick(); tree = render();
  assert.equal(nodes(tree, n => n.type === "img").length, 6); assert.deepEqual(revoked, ["blob:door-2"]);
  assert.equal(nodes(tree, n => n.type === "button" && n.props.type === "submit").length, 1);
});

test("only the owner sees account approval; unconfirmed accounts and owner modification are disabled", async () => {
  const harness = componentHarness(); let role = "owner", approved = null, reads = 0;
  const accounts = [{ user_id: OWNER.id, email: OWNER.email, confirmed: true, role: "owner" },
    { user_id: ALAA.id, email: ALAA.email, confirmed: true, role: "pending" },
    { user_id: "unconfirmed", email: "new@example.test", confirmed: false, role: "pending" }];
  const manager = await isolatedModule("src/components/admin/AdminAccountsManager.tsx", {
    react: harness.hooks, "react/jsx-runtime": harness.jsxRuntime,
    "../../lib/adminAccess": { useAdminAccess: () => ({ role }) },
    "../../lib/adminAccounts": { listAdminAccounts: async () => { reads++; return structuredClone(accounts); },
      approveAdmin: async id => { approved = id; accounts[1].role = "admin"; }, revokeAdmin: async () => {} },
  });
  const render = () => harness.render(manager.default);
  render(); await flush(); let tree = render();
  const buttons = nodes(tree, n => n.type === "button");
  assert.equal(buttons.length, 2, "owner has no edit/revoke button");
  assert.equal(buttons.filter(n => n.props.disabled).length, 1, "unconfirmed user cannot be approved");
  buttons.find(n => !n.props.disabled).props.onClick(); await flush(); tree = render();
  assert.equal(approved, ALAA.id); assert.ok(text(tree).includes("أدمن معتمد"));
  const priorReads = reads; role = "admin"; tree = render(); await flush();
  assert.ok(!text(tree).includes(ALAA.email)); assert.equal(reads, priorReads);
});

test("existing password-recovery page updates only the currently authenticated account", async () => {
  for (const user of [OWNER, ALAA]) {
    const harness = componentHarness(), changes = [], navigation = [];
    const page = await isolatedModule("src/pages/ResetPasswordPage.tsx", {
      react: harness.hooks, "react/jsx-runtime": harness.jsxRuntime,
      "react-router-dom": { Link: "Link", useNavigate: () => (...args) => navigation.push(args) },
      "../lib/supabaseClient": { supabase: { auth: {
        getSession: async () => ({ data: { session: { user } } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        updateUser: async payload => { changes.push({ actor: user.id, payload }); return { error: null }; },
      } } },
    }, { setTimeout: callback => { callback(); return 1; } });
    const render = () => harness.render(page.default);
    render(); await flush(); let tree = render();
    nodes(tree, n => n.type === "input" && n.props.type === "password").forEach(input => input.props.onChange({ target: { value: "isolated-new-password" } }));
    tree = render(); await nodes(tree, n => n.type === "form")[0].props.onSubmit({ preventDefault() {} });
    assert.deepEqual(structuredClone(changes), [{ actor: user.id, payload: { password: "isolated-new-password" } }]);
    assert.equal(navigation[0][0], "/admin"); assert.ok(text(render()).includes("تم بنجاح"));
  }
});


test('active owner-only mode has zero RPC calls, rejects unrelated users and clears on logout', async () => {
  let user=OWNER,listener,rpcCalls=0,error=null;
  const client={auth:{getSession:async()=>({data:{session:user?{user}:null},error}),onAuthStateChange:cb=>{listener=cb;}},rpc:()=>{rpcCalls++;throw Error('RPC must never run');}};
  const access=createAdminAccessController(client,undefined,true);
  access.start();await flush();assert.equal(access.getSnapshot().status,'authorized');assert.equal(access.getSnapshot().role,'owner');
  user=ALAA;await access.refresh();assert.equal(access.getSnapshot().status,'pending');assert.equal(access.getSnapshot().role,null);
  listener('SIGNED_IN',{user:{...ALAA,email:' HEBU.OZEN@GMAIL.COM '}});assert.equal(access.getSnapshot().role,'owner');
  listener('SIGNED_OUT',null);assert.equal(access.getSnapshot().status,'signed-out');
  error=Error('session failed');await access.refresh();assert.equal(access.getSnapshot().status,'error');assert.equal(access.getSnapshot().role,null);
  assert.equal(rpcCalls,0);
});
