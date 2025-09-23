// lib/supabaseServer.ts
import { createClient } from '@supabase/supabase-js';

type AdminCtx = {
  client: ReturnType<typeof createClient>;
  companyId: string;
};

export function getAdmin(): AdminCtx {
  const url = process.env.SUPABASE_URL || '';
  // accept either name so we don't play whack-a-mole with .env
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    '';
  const companyId = process.env.COMPANY_ID || '';

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE');
  }
  if (!companyId) {
    throw new Error('Missing COMPANY_ID');
  }

  const client = createClient(url, key, { auth: { persistSession: false } });
  return { client, companyId };
}
