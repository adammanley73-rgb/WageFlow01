export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseServer';

function normPayType(v: string | undefined | null) {
  const s = String(v || '').toLowerCase().trim();
  return s === 'hourly' ? 'hourly' : 'salary';
}
function normFrequency(v: string | undefined | null) {
  const s = String(v || '').toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
  if (s === 'weekly') return 'weekly';
  if (s === 'fortnightly' || s === 'biweekly') return 'fortnightly';
  if (s === 'fourweekly' || s === '4weekly') return 'four_weekly';
  return 'monthly';
}
function upperNoSpaces(s?: string | null) {
  return s ? s.replace(/\s+/g, '').toUpperCase() : null;
}
function isUUID(id?: string) {
  return !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(
  _req: Request,
  { params }: { params: { id?: string } }
) {
  try {
    const { client, companyId } = getAdmin();
    const id = params?.id;
    if (!isUUID(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const { data, error } = await client
      .from('employees')
      .select(
        'id, first_name, last_name, email, ni_number, pay_type, frequency, annual_salary, hours_per_week'
      )
      .eq('id', id)
      .eq('company_id', companyId)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unexpected error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id?: string } }
) {
  try {
    const id = params?.id;
    if (!isUUID(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = (await req.json()) as {
      first_name: string;
      last_name: string;
      email: string;
      ni_number?: string | null;
      pay_type?: string | null;
      frequency?: string | null;
      annual_salary?: number | null;
      hours_per_week?: number | null;
    };

    if (!body.first_name || !body.last_name || !body.email) {
      return NextResponse.json(
        { error: 'first_name, last_name and email are required' },
        { status: 400 }
      );
    }

    const { client, companyId } = getAdmin();

    const update = {
      first_name: body.first_name.trim(),
      last_name: body.last_name.trim(),
      email: body.email.trim(),
      ni_number: upperNoSpaces(body.ni_number ?? null),
      pay_type: normPayType(body.pay_type),
      frequency: normFrequency(body.frequency),
      annual_salary:
        body.annual_salary != null ? Number(body.annual_salary) : null,
      hours_per_week:
        body.hours_per_week != null ? Number(body.hours_per_week) : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('employees')
      .update(update)
      .eq('id', id)
      .eq('company_id', companyId)
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
