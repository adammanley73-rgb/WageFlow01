// C:\Users\adamm\Projects\wageflow01\lib\admin.ts
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminContext = {
  client: SupabaseClient;
  companyId: string;
};

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    s
  );
}

async function getActiveCompanyIdFromCookies(): Promise<string | null> {
  try {
    const jar = await cookies();
    const v =
      jar.get("active_company_id")?.value ??
      jar.get("company_id")?.value ??
      null;

    if (!v) return null;
    const trimmed = String(v).trim();
    return isUuid(trimmed) ? trimmed : null;
  } catch {
    return null;
  }
}

function getCompanyIdFallbackFromEnv(): string | null {
  const v = (process.env.COMPANY_ID || "").trim();
  if (!v) return null;
  return isUuid(v) ? v : null;
}

async function resolveCompanyId(): Promise<string | null> {
  // Primary: browser/session context
  const cookieCompanyId = await getActiveCompanyIdFromCookies();
  if (cookieCompanyId) return cookieCompanyId;

  // Fallback: local/dev or single-tenant pinned instance
  return getCompanyIdFallbackFromEnv();
}

function resolveSupabaseUrl(): string {
  return (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).trim();
}

function resolveServiceKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ""
  ).trim();
}

// Kept for potential future use, but not used by default
function createPreviewClient(): any {
  const emptyResult = { data: [], error: null };

  const makeBuilder = () => {
    const b: any = {};
    const chain = () => b;

    b.select = chain;
    b.eq = chain;
    b.neq = chain;
    b.gte = chain;
    b.lte = chain;
    b.gt = chain;
    b.lt = chain;
    b.in = chain;
    b.ilike = chain;
    b.order = chain;
    b.limit = chain;
    b.range = chain;

    b.then = (resolve: any, reject: any) =>
      Promise.resolve(emptyResult).then(resolve, reject);

    return b;
  };

  return { __isPreviewStub: true, from: () => makeBuilder() };
}

let cachedAdminClient: SupabaseClient | null = null;
let cachedUrl = "";
let cachedKey = "";

function getOrCreateAdminClient(url: string, key: string): SupabaseClient {
  if (cachedAdminClient && cachedUrl === url && cachedKey === key)
    return cachedAdminClient;

  cachedUrl = url;
  cachedKey = key;

  cachedAdminClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return cachedAdminClient;
}

export async function getAdmin(): Promise<AdminContext | null> {
  const companyId = await resolveCompanyId();
  if (!companyId) return null;

  // Preview stub disabled - preview deployments now use real Supabase client
  // To re-enable stub behavior, set WAGEFLOW_USE_PREVIEW_STUB=1 in environment
  const useStub = process.env.WAGEFLOW_USE_PREVIEW_STUB === "1";
  if (useStub) {
    return { client: createPreviewClient(), companyId };
  }

  const url = resolveSupabaseUrl();
  const key = resolveServiceKey();

  if (!url || !key) {
    console.error("Admin client unavailable: missing SUPABASE url/key env vars.");
    return null;
  }

  const client = getOrCreateAdminClient(url, key);
  return { client, companyId };
}
