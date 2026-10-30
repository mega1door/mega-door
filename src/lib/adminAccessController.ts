import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AdminRole = "owner" | "admin";
export type AdminUser = Pick<User, "id" | "email" | "email_confirmed_at">;
export type AdminAccessState = {
  status: "loading" | "signed-out" | "pending" | "authorized" | "error";
  role: AdminRole | null;
  user: AdminUser | null;
};

/** Supabase Auth remains the only identity system; the RPC supplies server authorization. */
export function createAdminAccessController(client: Pick<SupabaseClient, "auth" | "rpc">, defer: (callback: () => void) => void = callback => { setTimeout(callback, 0); }, ownerOnly = false) {
  let state: AdminAccessState = { status: "loading", role: null, user: null };
  let revision = 0, started = false;
  const listeners = new Set<() => void>();
  const update = (next: AdminAccessState) => { state = next; listeners.forEach(listener => listener()); };
  function resolveUser(user: AdminUser | null) {
    const request = ++revision;
    update({ status: user ? "loading" : "signed-out", role: null, user });
    if (!user) return;
    // Compatibility with the existing owner gate. This is UI authorization only;
    // unchanged production RLS remains responsible for all database writes.
    if (ownerOnly) {
      const owner = user.id === "4ece01b2-d222-4291-b404-60bff142177f" ||
        user.email?.trim().toLowerCase() === "hebu.ozen@gmail.com";
      update({ status: owner ? "authorized" : "pending", role: owner ? "owner" : null, user });
      return;
    }
    // Never await another Supabase call inside onAuthStateChange's callback.
    defer(() => { void (async () => {
      try {
        if (request !== revision) return;
        const { data, error } = await client.rpc("mega_admin_role");
        if (request !== revision) return;
        if (error) throw error;
        const role = user.email_confirmed_at && (data === "owner" || data === "admin") ? data : null;
        update({ status: role ? "authorized" : "pending", role, user });
      } catch {
        if (request === revision) update({ status: "error", role: null, user });
      }
    })(); });
  }
  async function refresh() {
    const request = ++revision;
    update({ status: "loading", role: null, user: state.user });
    try {
      const { data, error } = await client.auth.getSession();
      if (request !== revision) return;
      if (error) throw error;
      resolveUser(data.session?.user ?? null);
    } catch {
      if (request === revision) update({ status: "error", role: null, user: null });
    }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start() {
      if (started) return;
      started = true;
      client.auth.onAuthStateChange((_event, session) => resolveUser(session?.user ?? null));
      void refresh();
    },
    refresh,
  };
}
