// C:\Projects\wageflow01\lib\supabase\server.ts

// This file runs on the server when imported by API routes or server components.
// Do not add a "use server" pragma here.

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function requireEnv(name: string, value: string | undefined): string {
  const v = String(value ?? "").trim();
  if (!v) {
    throw new Error(`Supabase env var missing: ${name}`);
  }
  return v;
}

function buildClient(cookieStore: CookieStore): SupabaseClient {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // In some server contexts Next blocks setting cookies. Safe to ignore.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        } catch {
          // Same as above.
        }
      },
    },
  });
}

/**
 * Canonical server Supabase client factory used by API routes and server components.
 * This is the export most of the repo expects.
 */
export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return buildClient(cookieStore);
}

/**
 * Legacy name used by older routes/components.
 * Kept to avoid churn across the codebase.
 */
export async function getServerSupabase(): Promise<SupabaseClient> {
  return createClient();
}

/**
 * Older name already present in this repo.
 * Keep it as an alias so existing imports continue to work.
 */
export async function supabaseServer(): Promise<SupabaseClient> {
  return createClient();
}