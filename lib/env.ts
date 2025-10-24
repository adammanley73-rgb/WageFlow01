// lib/env.ts
// Public env shim. Exports named constants, a default 'env' object,
// and also a named 'env' to satisfy both import styles.

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

// Default + named 'env' export for legacy imports
const env = {
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
};
export default env;
export { env };
