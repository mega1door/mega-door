import { supabase } from "./supabaseClient";

export type AdminAccount = { user_id: string; email: string | null; confirmed: boolean; role: "owner" | "admin" | "pending" };
export async function listAdminAccounts(): Promise<AdminAccount[]> {
  const { data, error } = await supabase.rpc("mega_admin_accounts");
  if (error) throw error;
  if (!Array.isArray(data) || !data.every(row => row && typeof row.user_id === "string" &&
      (row.email === null || typeof row.email === "string") && typeof row.confirmed === "boolean" &&
      ["owner", "admin", "pending"].includes(row.role))) throw new Error("Invalid accounts response");
  return data;
}
export async function approveAdmin(userId: string) {
  const { error } = await supabase.rpc("mega_approve_admin", { target_user_id: userId });
  if (error) throw error;
}
export async function revokeAdmin(userId: string) {
  const { error } = await supabase.rpc("mega_revoke_admin", { target_user_id: userId });
  if (error) throw error;
}
