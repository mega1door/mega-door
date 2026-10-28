export type DeletionUser = { id: string; email?: string };
export type DeletionDependencies = {
  authenticate(token: string): Promise<DeletionUser | null>;
  role(token: string): Promise<string | null>;
  ready(token: string): Promise<boolean>;
  reauthenticate(email: string, password: string): Promise<{ user: DeletionUser; cleanup(): Promise<void> } | null>;
  eraseCredentials(userId: string): Promise<void>;
};
const OWNER_ID = "4ece01b2-d222-4291-b404-60bff142177f";

/** Server only. No target ID is accepted; no catalog or Storage operations exist here. */
export function deletionHandler(deps: DeletionDependencies, allowedOrigins = ["https://mega1door.github.io"]) {
  return async (request: Request) => {
    const origin = request.headers.get("Origin");
    const headers: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin" };
    if (origin && allowedOrigins.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
    const respond = (status: number, error?: string) => new Response(JSON.stringify(error ? { error } : { success: true }), { status, headers });
    if (origin && !allowedOrigins.includes(origin)) return respond(403, "origin_denied");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...headers, "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" } });
    if (request.method !== "POST") return respond(405, "method_denied");
    const token = request.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return respond(401, "sign_in_required");
    let cleanup: (() => Promise<void>) | undefined;
    try {
      const raw = await request.text();
      if (raw.length > 4096) return respond(413, "request_too_large");
      let body;
      try { body = JSON.parse(raw); } catch { return respond(400, "invalid_request"); }
      if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => !["password", "confirmation"].includes(key)) ||
          typeof body.password !== "string" || !body.password || body.confirmation !== "حذف حسابي") return respond(400, "confirmation_required");
      const user = await deps.authenticate(token);
      if (!user?.id || !user.email) return respond(401, "sign_in_required");
      if (user.id === OWNER_ID || await deps.role(token) === "owner") return respond(403, "owner_protected");
      if (!await deps.ready(token)) return respond(503, "deletion_unavailable");
      const verified = await deps.reauthenticate(user.email, body.password);
      if (!verified) return respond(401, "password_incorrect");
      cleanup = verified.cleanup;
      if (verified.user.id !== user.id) return respond(403, "identity_mismatch");
      // Soft deletion is irreversible for the credentials, while internal IDs keep
      // uploaded site assets intact. RLS excludes deleted_at and drops membership.
      await deps.eraseCredentials(user.id);
      return respond(200);
    } catch { return respond(503, "deletion_unavailable"); }
    finally { if (cleanup) { try { await cleanup(); } catch { /* Session may already be revoked by Auth. */ } } }
  };
}
