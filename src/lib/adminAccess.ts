import { useSyncExternalStore } from "react";
import { supabase } from "./supabaseClient";
import { createAdminAccessController } from "./adminAccessController";

const access = createAdminAccessController(supabase);
access.start();
export const refreshAdminAccess = access.refresh;
export function useAdminAccess() {
  return useSyncExternalStore(access.subscribe, access.getSnapshot, access.getSnapshot);
}
