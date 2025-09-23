export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseServer';

type Body = {
  first_name: string;
  last_name: string;
  email: string;
  ni_number?: string | null;
  pay_type: string;        // "Salary" | "Hourly"
  base_pay?: number | null;
  frequency: string;       // Weekly | Fortnightly | Four-weekly | Monthly
  annual_salary: number;
  hours_per_week?: number | null;
};

function normPayType(v: string) {
  const s = String(v || '').toLowerCase().trim();
  return s === 'hourly' ? 'hourly' : 'salary';
}
function normFrequency(v: string) {
  const s = String(v || '').toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
  if (s === 'weekly') return 'weekly';
  if (s === 'fortnightly' || s === 'biweekly') return 'fortnightly';
  if (s === 'fourweekly' || s === '4weekly') return 'four_weekly';
  return 'monthly';
}
function upperNoSpaces(s?: string | null) {
  return s ? s.replace(/\s+/g, '').toUpperCase() : null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.first_name || !body?.last_name || !body?.email) {
      return NextResponse.json(
        { error: 'first_name, last_name and email are required' },
        { status: 400 }
      );
    }
    const annual = Number(body.annual_salary);
    if (!Number.isFinite(annual) || annual <= 0) {
      return NextResponse.json({ error: 'annual_salary must be > 0' }, { status: 400 });
    }
    const hours =
      body.hours_per_week != null && body.hours_per_week !== undefined
        ? Number(body.hours_per_week)
        : null;

    const { client, companyId } = getAdmin();

    const { data, error } = await client
      .from('employees')
      .insert({
        first_name: body.first_name.trim(),
        last_name: body.last_name.trim(),
        email: body.email.trim(),
        ni_number: upperNoSpaces(body.ni_number ?? null),
        pay_type: normPayType(body.pay_type),
        base_pay: Number(body.base_pay) || 0,
        frequency: normFrequency(body.frequency),
        annual_salary: annual,
        hours_per_week: hours,
        company_id: companyId,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ id: data.id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unexpected error' }, { status: 500 });
  }
}
