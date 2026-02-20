/* @ts-nocheck */

// This file runs on the server when imported by API routes. Do not add a "use server" pragma here.

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Returns a server‑side Supabase client.
 *
 * Reads the Supabase URL and anon key from environment variables and wires the cookie
 * store so session cookies are sent on subsequent requests. Throws if the env vars
 * are missing.
 */
export async function createClient() {
  const cookieStore = await cookies();
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
 * Preferred async helper name for server‑side Supabase. Wraps `createClient`.
 */
export async function getServerSupabase() {
  return createClient();
}
