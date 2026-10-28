import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(process.env.MEGA_PGLITE_MODULE || "@electric-sql/pglite");
const OWNER = "4ece01b2-d222-4291-b404-60bff142177f";
const ALAA = "10000000-0000-4000-8000-000000000001";
const PENDING = "10000000-0000-4000-8000-000000000002";
const tables = ["models", "categories", "spec_templates", "site_settings"];

test("real PostgreSQL RLS proposal, isolated in-memory database only", async t => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz,created_at timestamptz default now());
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;
      create table storage.objects(id text primary key,bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon,authenticated;
      grant all on storage.objects to anon,authenticated;
      create policy legacy_open on storage.objects for all to anon,authenticated using(true) with check(true);
      insert into storage.objects values('original','site-images','models/original.webp');`);
    for (const table of tables) await db.exec(`create table public.${table}(id text primary key,value text);
      alter table public.${table} enable row level security;
      grant all on public.${table} to anon,authenticated;
      create policy legacy_open on public.${table} for all to anon,authenticated using(true) with check(true);
      insert into public.${table} values('original','preserved');`);
    await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'hebu.ozen@gmail.com',now()),($2,'alaa@example.test',now()),($3,'unconfirmed@example.test',null)", [OWNER, ALAA, PENDING]);
    const originalOwner = (await db.query("select * from auth.users where id=$1", [OWNER])).rows[0];
    const proposal = await readFile("supabase/proposals/01_admin_access.sql", "utf8") + '\n' + await readFile("supabase/proposals/02_self_delete.sql", "utf8");
    await db.exec(proposal);
    async function as(role, id = "") {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
      await db.exec(`set role ${role}`);
    }
    const role = async () => (await db.query("select public.mega_admin_role() as role")).rows[0].role;
    async function deniedOrNoRows(sql) {
      try { assert.equal((await db.query(sql)).rows.length, 0); }
      catch (error) { assert.equal(error.code, "42501"); }
    }

    await t.test("anonymous and unapproved accounts cannot write directly despite legacy permissive policies", async () => {
      for (const [actor, id] of [["anon", ""], ["authenticated", ALAA]]) {
        await as(actor, id); assert.equal(await role(), null);
        for (const table of tables) {
          assert.equal((await db.query(`select * from public.${table}`)).rows.length, 1);
          await assert.rejects(db.query(`insert into public.${table} values('attack','no')`));
          await deniedOrNoRows(`update public.${table} set value='no' where id='original' returning *`);
          await deniedOrNoRows(`delete from public.${table} where id='original' returning *`);
          await assert.rejects(db.exec(`truncate public.${table}`));
        }
        await assert.rejects(db.exec("insert into storage.objects values('attack','site-images','models/no.webp')"));
        await assert.rejects(db.exec("truncate storage.objects"));
        assert.equal((await db.query("update storage.objects set name='models/no.webp' where id='original' returning *")).rows.length, 0);
        assert.equal((await db.query("delete from storage.objects where id='original' returning *")).rows.length, 0);
        await assert.rejects(db.query("insert into mega_private.admin_memberships(user_id,role) values($1,'owner')", [ALAA]));
        await assert.rejects(db.query("select public.mega_approve_admin($1)", [ALAA]));
        await assert.rejects(db.query("select * from public.mega_admin_accounts()"));
      }
    });

    await t.test("owner retained, confirmation required, self-grant and metadata spoofing denied", async () => {
      await as("authenticated", ALAA);
      await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ user_metadata: { role: "owner", is_admin: true } })]);
      assert.equal(await role(), null);
      await as("authenticated", OWNER); assert.equal(await role(), "owner");
      await assert.rejects(db.query("select public.mega_approve_admin($1)", [PENDING]));
      await assert.rejects(db.query("select public.mega_revoke_admin($1)", [OWNER]));
      await assert.rejects(db.query("select public.mega_approve_admin($1)", [OWNER]));
      const accounts = (await db.query("select * from public.mega_admin_accounts()")).rows;
      assert.equal(accounts.length, 3);
      assert.deepEqual(Object.keys(accounts[0]).sort(), ["confirmed", "email", "role", "user_id"]);
      await db.query("select public.mega_approve_admin($1)", [ALAA]);
    });

    await t.test("approved second admin manages all four tables and image objects, but cannot grant permissions", async () => {
      await as("authenticated", ALAA); assert.equal(await role(), "admin");
      for (const table of tables) {
        await db.query(`insert into public.${table} values('second-admin','new')`);
        assert.equal((await db.query(`update public.${table} set value='edited' where id='second-admin' returning *`)).rows.length, 1);
        assert.equal((await db.query(`delete from public.${table} where id='second-admin' returning *`)).rows.length, 1);
      }
      await db.exec("insert into storage.objects values('second-admin','site-images','models/test.webp')");
      assert.equal((await db.query("update storage.objects set name='site/test.webp' where id='second-admin' returning *")).rows.length, 1);
      assert.equal((await db.query("delete from storage.objects where id='second-admin' returning *")).rows.length, 1);
      await assert.rejects(db.query("select public.mega_approve_admin($1)", [PENDING]));
      await assert.rejects(db.exec("select * from mega_private.admin_memberships"));
      await assert.rejects(db.query("update auth.users set email='no@example.test' where id=$1", [OWNER]));
    });

    await t.test("revocation takes effect with the same identity; original owner and catalog stay unchanged", async () => {
      await as("authenticated", OWNER);
      await db.query("select public.mega_revoke_admin($1)", [ALAA]);
      await as("authenticated", ALAA); assert.equal(await role(), null);
      await assert.rejects(db.exec("insert into models values('after-revoke','no')"));
      await as("authenticated", OWNER); assert.equal(await role(), "owner");
      await db.exec("insert into models values('owner-test','yes'); delete from models where id='owner-test'");
      await as("postgres");
      assert.deepEqual((await db.query("select * from auth.users where id=$1", [OWNER])).rows[0], originalOwner);
      for (const table of tables) assert.deepEqual((await db.query(`select * from ${table}`)).rows, [{ id: "original", value: "preserved" }]);
      await db.exec(proposal); // Safe reapplication, no data or owner replacement.
      assert.equal((await db.query("select count(*)::int as count from mega_private.admin_memberships where role='owner'")).rows[0].count, 1);
    });

    await t.test("self deletion removes access immediately without changing catalog or images", async () => {
      await as("authenticated", OWNER); await db.query("select public.mega_approve_admin($1)",[ALAA]);
      await as("authenticated",ALAA); assert.equal((await db.query('select public.mega_self_delete_ready() as ready')).rows[0].ready,true);
      await as("postgres"); await db.query('update auth.users set deleted_at=now() where id=$1',[ALAA]);
      await as("authenticated",ALAA); assert.equal(await role(),null);
      await assert.rejects(db.exec("insert into models values('deleted-user','no')"));
      await as("authenticated",OWNER); assert.equal(await role(),'owner');
      assert.ok(!(await db.query('select * from public.mega_admin_accounts()')).rows.some(r=>r.user_id===ALAA));
      await assert.rejects(db.query('select public.mega_approve_admin($1)',[ALAA]));
      await as("postgres");
      assert.equal((await db.query('select * from storage.objects')).rows.length,1);
      assert.equal((await db.query('select * from models')).rows.length,1);
      assert.equal((await db.query('select * from mega_private.admin_memberships where user_id=$1',[ALAA])).rows.length,0);
    });

    await t.test("an unknown existing restrictive policy stops the proposal for manual review", async () => {
      await db.exec("create policy mega_unreviewed on public.models as restrictive for update to authenticated using(true)");
      await assert.rejects(db.exec(proposal), /Review existing restrictive policies first/);
      await db.exec("rollback");
      assert.deepEqual((await db.query("select * from models")).rows, [{ id: "original", value: "preserved" }]);
    });
  } finally { await db.close(); }
});
