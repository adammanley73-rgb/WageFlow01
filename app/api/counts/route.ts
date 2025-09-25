/* @ts-nocheck */
// app/api/counts/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function admin() {
  const url = process.env.SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    '';
  const companyId = process.env.COMPANY_ID || '';
  if (!url || !key || !companyId) {
    throw new Error('counts: missing env');
  }
  return {
    supabase: createClient(url, key, { auth: { persistSession: false } }),
    companyId,
  };
}

export async function GET() {
  try {
    const { supabase, companyId } = admin();

    // Employees count
    const { count: employeesCount, error: empErr } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (empErr) {
      return NextResponse.json(
        { employees: 0, runs: 0, tasks: 0, notices: 0, detail: empErr.message },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // Runs, tasks, notices left as 0 for now
    return NextResponse.json(
      {
        employees: employeesCount ?? 0,
        runs: 0,
        tasks: 0,
        notices: 0,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e: any) {
    return NextResponse.json(
      { employees: 0, runs: 0, tasks: 0, notices: 0, detail: String(e?.message || e) },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}


