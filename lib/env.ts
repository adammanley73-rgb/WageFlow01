// lib/env.ts
// Minimal non-secret env shim so imports like "@lib/env" resolve in API routes.

type NonEmpty = string & { __brand: "NonEmpty" };
function must(name: string): NonEmpty {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v as NonEmpty;
}

export const NEXT_PUBLIC_SUPABASE_URL: NonEmpty = must("NEXT_PUBLIC_SUPABASE_URL");
export const NEXT_PUBLIC_SUPABASE_ANON_KEY: NonEmpty = must("NEXT_PUBLIC_SUPABASE_ANON_KEY");

// Add other public envs here as needed, keeping secrets out of NEXT_PUBLIC_*.
