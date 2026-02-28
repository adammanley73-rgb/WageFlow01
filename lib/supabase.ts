// C:\Projects\wageflow01\lib\supabase.ts

/**
 * IMPORTANT
 * This module must NOT provide a working Supabase client.
 *
 * Historically this file was a "preview chainable stub" that returned empty data with no errors.
 * That is extremely dangerous because it can silently mask real database failures.
 *
 * Correct imports:
 * - Server code (API routes, server components): import from "@/lib/supabase/server"
 * - Browser/client components: import from "@/lib/supabase/client"
 *
 * If anything imports "@/lib/supabase", it should fail loudly so we can fix the import.
 */

const ERR =
  'Do not import Supabase from "@/lib/supabase". ' +
  'Use "@/lib/supabase/server" for server code or "@/lib/supabase/client" for client code.';

function hardFail(): never {
  throw new Error(ERR);
}

// Keep these exports so TypeScript compiles while we refactor imports.
// Any runtime use will fail loudly.
export const supabase: any = new Proxy(
  {},
  {
    get() {
      return hardFail;
    },
    apply() {
      return hardFail();
    },
  }
);

export function createClient(): never {
  return hardFail();
}

export function getServerSupabase(): never {
  return hardFail();
}

export const supabaseServer = supabase;

export default supabase;