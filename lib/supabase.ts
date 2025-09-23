import { createClient } from "@supabase/supabase-js";

type Client = ReturnType<typeof createClient> | null;

export function getSupabaseServer(): Client {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Be resilient: if envs are missing, return null instead of throwing
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
