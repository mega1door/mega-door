import { supabase } from "./supabaseClient";
import { canonicalPageUrl } from "./catalogMetadata";

export async function registerAdminCandidate(email: string, password: string) {
  // This RPC and the RLS gates are installed atomically by the reviewed proposal.
  // Do not create real accounts from a preview before that protection is ready.
  const { error: readinessError } = await supabase.rpc("mega_admin_role");
  if (readinessError) throw readinessError;
  const { error } = await supabase.auth.signUp({ email: email.trim(), password,
    options: { emailRedirectTo: canonicalPageUrl("/admin") } });
  if (error) throw error;
}

export async function requestAdminPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: canonicalPageUrl("/reset-password") });
  if (error) throw error;
}

export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
}

export async function deleteOwnAccount(password: string, confirmation: string) {
  if (!password || confirmation !== "حذف حسابي") throw new Error("Confirmation required");
  const { data, error } = await supabase.functions.invoke("delete-own-account", { body: { password, confirmation } });
  if (error || data?.success !== true) throw error || new Error("Deletion unavailable");
  await signOutAdmin();
}

// Enable only after approved hosted RLS/Auth verification.
export const ACCOUNT_MANAGEMENT_ENABLED = false;
