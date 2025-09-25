/* @ts-nocheck */
// app/api/_diag/env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const hasUrl = !!process.env.SUPABASE_URL && process.env.SUPABASE_URL!.startsWith('https://');
  const hasSrv = !!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY!.length > 40;

  return NextResponse.json({
    ok: hasUrl && hasSrv,
    supabase_url_present: hasUrl,
    service_role_present: hasSrv,
  });
}


