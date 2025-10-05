/**
 * Stub env loader.
 * Replace with real environment handling after deployment.
 */
export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
};

export default env;
