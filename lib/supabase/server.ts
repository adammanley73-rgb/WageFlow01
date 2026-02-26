// C:\Projects\wageflow01\lib\supabase\server.ts

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function env(name: string): string {
  const v = process.env[name];
  return v && String(v).trim() ? String(v).trim() : "";
}

function cookieAdapter(store: CookieStore) {
  return {
    get(name: string) {
      return store.get(name)?.value;
    },
    set(name: string, value: string, options: CookieOptions) {
      try {
        store.set({ name, value, ...options });
      } catch {
        // Can throw in some server component contexts. Safe to ignore.
      }
    },
    remove(name: string, options: CookieOptions) {
      try {
        store.set({ name, value: "", ...options, maxAge: 0 });
      } catch {
        // Can throw in some server component contexts. Safe to ignore.
      }
    },
  };
}

export async function createClient(): Promise<SupabaseClient> {
  const store = await cookies();

  const url = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL");
  const anon = env("NEXT_PUBLIC_SUPABASE_ANON_KEY") || env("SUPABASE_ANON_KEY");

  if (!url || !anon) {
    throw new Error(
      "Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)."
    );
  }

  return createServerClient(url, anon, {
    cookies: cookieAdapter(store),
  });
}

export async function getServerSupabase(): Promise<SupabaseClient> {
  return createClient();
}