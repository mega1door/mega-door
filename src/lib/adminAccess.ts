import { useSyncExternalStore } from "react";
import { supabase } from "./supabaseClient";
import { createAdminAccessController } from "./adminAccessController";

// Keep owner login independent of the proposed, uninstalled role RPC.
// New account management remains disabled separately in adminAuth.ts.
const access = createAdminAccessController(supabase, undefined, true);
access.start();
export const refreshAdminAccess = access.refresh;
export function useAdminAccess() {
  return useSyncExternalStore(access.subscribe, access.getSnapshot, access.getSnapshot);
}
