/* @ts-nocheck */
"use server";

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Returns a server‑side Supabase client.
 *
 * This matches the previous behaviour of this file. It reads the Supabase URL
 * and anonymous key from environment variables and wires the cookie store so
 * session cookies are sent on subsequent requests. If the env vars are missing
 * it throws an error.
 */
export function createClient() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
      try {
        cookieStore.set({ name, value, ...options });
      } catch {}
    },
      remove(name: string, options: CookieOptions) {
      try {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      } catch {}
    },
    },
  });
}

/**
 * Preferred helper name for server‑side Supabase. This returns the same client
 * as `createClient` but using an async signature for future extensibility.
 */
export async function getServerSupabase() {
  return createClient();
}
