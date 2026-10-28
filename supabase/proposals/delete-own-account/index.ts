// DRAFT Edge Function. Not in supabase/functions; not deployed automatically.
import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { deletionHandler } from "./handler.ts";
const url = Deno.env.get("SUPABASE_URL")!;
const publicKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // Server environment only.
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, options);
const caller = (token: string) => createClient(url, publicKey, { ...options, global: { headers: { Authorization: `Bearer ${token}` } } });
Deno.serve(deletionHandler({
  async authenticate(token) { const { data, error } = await caller(token).auth.getUser(token); return error ? null : data.user; },
  async role(token) { const { data, error } = await caller(token).rpc("mega_admin_role"); if (error) throw error; return data; },
  async ready(token) { const { data, error } = await caller(token).rpc("mega_self_delete_ready"); return !error && data === true; },
  async reauthenticate(email, password) {
    const client = createClient(url, publicKey, options);
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user) return null;
    return { user: data.user, cleanup: async () => { await client.auth.signOut({ scope: "local" }); } };
  },
  async eraseCredentials(userId) { const { error } = await admin.auth.admin.deleteUser(userId, true); if (error) throw error; },
}));
