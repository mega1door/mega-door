import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./supabaseConfig";

export type PublicCatalogTable = "models" | "categories" | "site_settings";

export interface PublicApiError extends Error {
  status?: number;
  code?: string;
  details?: string;
  hint?: string;
}

/** Read-only PostgREST access for the public storefront; it uses the same anon key and RLS as the SDK. */
export async function fetchPublicRows<T>(
  table: PublicCatalogTable,
  query: Record<string, string>,
): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);
  url.search = new URLSearchParams(query).toString();

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      Accept: "application/json",
    },
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const error = new Error(typeof payload.message === "string" ? payload.message : `Supabase read failed (${response.status})`) as PublicApiError;
    error.status = response.status;
    if (typeof payload.code === "string") error.code = payload.code;
    if (typeof payload.details === "string") error.details = payload.details;
    if (typeof payload.hint === "string") error.hint = payload.hint;
    throw error;
  }

  if (!Array.isArray(body)) throw new Error("Supabase returned an invalid catalog response.");
  return body as T[];
}
