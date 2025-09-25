/* @ts-nocheck */
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Body = {
  email: string;
};

function env() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE');
  }
  return { url, key };
}

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as Body;
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Provide email' }, { status: 400 });
    }

    const needle = email.trim().toLowerCase();
    const { url, key } = env();
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // Block delete if employee is referenced by pay_run_employees
    const { data: refs, error: refErr } = await supabase
      .from('pay_run_employees')
      .select('employee_id')
      .in(
        'employee_id',
        (
          await supabase
            .from('employees')
            .select('id')
            .ilike('email', needle)
        ).data?.map((r: any) => r.id) || []
      );

    if (refErr) {
      return NextResponse.json({ error: refErr.message }, { status: 400 });
    }
    if (refs && refs.length > 0) {
      return NextResponse.json(
        { error: 'Employee is referenced by payroll runs. Cannot purge.' },
        { status: 409 }
      );
    }

    // Delete rows with case-insensitive match on email
    const { error: delErr, count } = await supabase
      .from('employees')
      .delete({ count: 'exact' })
      .filter('email', 'ilike', needle);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 400 });
    }

    return NextResponse.json({ deleted: count ?? 0 }, { status: 200 });
  } catch (err: any) {
    const msg = typeof err?.message === 'string' ? err.message : 'Unexpected server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


