/** True only for URLs where Supabase may emit an auth callback needed by recovery flow. */
export function isSupabaseAuthCallback(location: { pathname: string; search: string; hash: string }): boolean {
  if (location.pathname === "/reset-password") return true;

  const search = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.startsWith("#") ? location.hash.slice(1) : location.hash);
  const callbackKeys = ["code", "type", "access_token", "refresh_token", "error"];
  return callbackKeys.some((key) => search.has(key) || hash.has(key));
}
