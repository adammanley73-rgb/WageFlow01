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

function getActiveCompanyIdFromCookies(): string | null {
  try {
    const jar = cookies();
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

function isPreview(): boolean {
  return process.env.VERCEL_ENV === "preview" || process.env.WAGEFLOW_PREVIEW === "1";
}

function resolveSupabaseUrl(): string {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}

function resolveServiceKey(): string {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "").trim();
}

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

    b.then = (resolve: any, reject: any) => Promise.resolve(emptyResult).then(resolve, reject);

    return b;
  };

  return { __isPreviewStub: true, from: () => makeBuilder() };
}

let cachedAdminClient: SupabaseClient | null = null;
let cachedUrl = "";
let cachedKey = "";

function getOrCreateAdminClient(url: string, key: string): SupabaseClient {
  if (cachedAdminClient && cachedUrl === url && cachedKey === key) return cachedAdminClient;

  cachedUrl = url;
  cachedKey = key;

  cachedAdminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  return cachedAdminClient;
}

export async function getAdmin(): Promise<AdminContext | null> {
  const companyId = getActiveCompanyIdFromCookies();
  if (!companyId) return null;

  if (isPreview()) {
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
