export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseServer';

type Params = { params: { id: string } };
const json = (s: number, b: unknown) => NextResponse.json(b, { status: s });

/**
 * Table assumed:
 *   public.employee_emergency_contacts (
 *     employee_id uuid pk/fk -> employees.id,
 *     company_id  uuid not null,
 *     contact_name text,
 *     relationship text,
 *     phone text,
 *     email text,
 *     updated_at timestamptz default now()
 *   )
 * Shape matches the “Emergency table hardening” migration you said you ran.
 */

export async function GET(_req: Request, { params }: Params) {
  try {
    const { client, companyId } = getAdmin();

    const { data, error } = await client
      .from('employee_emergency_contacts')
      .select('contact_name, relationship, phone, email')
      .eq('employee_id', params.id)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) return json(500, { error: 'load_failed', detail: error.message });
    return json(200, { ok: true, data: data ?? null });
  } catch (e: any) {
    return json(500, { error: 'server_error', detail: e?.message || String(e) });
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { client, companyId } = getAdmin();

    const body = (await req.json().catch(() => ({}))) as {
      contact_name?: string | null;
      relationship?: string | null;
      phone?: string | null;
      email?: string | null;
    };

    const row = {
      employee_id: params.id,
      company_id: companyId,
      contact_name: body.contact_name?.trim() || null,
      relationship: body.relationship?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
    };

    // Upsert without relying on a unique constraint name
    const { data: existing, error: selErr } = await client
      .from('employee_emergency_contacts')
      .select('employee_id')
      .eq('employee_id', params.id)
      .eq('company_id', companyId)
      .maybeSingle();

    if (selErr) return json(500, { error: 'select_failed', detail: selErr.message });

    if (existing) {
      const { error: updErr } = await client
        .from('employee_emergency_contacts')
        .update({
          contact_name: row.contact_name,
          relationship: row.relationship,
          phone: row.phone,
          email: row.email,
          updated_at: new Date().toISOString(),
        })
        .eq('employee_id', params.id)
        .eq('company_id', companyId);

      if (updErr) return json(400, { error: 'update_failed', detail: updErr.message });
    } else {
      const { error: insErr } = await client
        .from('employee_emergency_contacts')
        .insert({ ...row, updated_at: new Date().toISOString() });

      if (insErr) return json(400, { error: 'insert_failed', detail: insErr.message });
    }

    return json(200, { ok: true });
  } catch (e: any) {
    return json(500, { error: 'server_error', detail: e?.message || String(e) });
  }
}
