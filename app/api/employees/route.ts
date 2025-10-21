// @ts-nocheck
// app/api/employees/route.ts
// List + create employees, scoped by the active company cookie,
// with Supabase if available and an in-memory fallback for dev.

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import * as store from '@/lib/employeeStore';

type EmployeeRow = {
  id?: string;
  company_id: string;
  name: string | null;
  email: string | null;
  job_title: string | null;
  start_date: string | null;
  employment_type: string | null;
  salary: number | null;
  hourly_rate: number | null;
  hours_per_week: number | null;
  ni_number: string | null;
  pay_frequency: string | null;
  created_at?: string;
  updated_at?: string;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const key = serviceKey || anonKey;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function getActiveCompanyId(): string | null {
  const jar = cookies();
  return (
    jar.get('company_id')?.value ||
    jar.get('active_company_id')?.value ||
    null
  );
}

// GET /api/employees
export async function GET() {
  const companyId = getActiveCompanyId();
  if (!companyId) return new Response(null, { status: 204 });

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('employees')
        .select('id,name,email,job_title,ni_number')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) return new Response(null, { status: 204 });
      return Response.json({ data }, { status: 200 });
    } catch (e: any) {
      // Fall through to local store if DB throws a tantrum
    }
  }

  // Fallback: dev in-memory store
  const list = await store.listByCompany(companyId);
  if (!list || list.length === 0) return new Response(null, { status: 204 });
  // Normalize fields to match the table columns above
  const data = list.map((r: any) => ({
    id: r.id,
    name: r.name ?? null,
    email: r.email ?? null,
    job_title: r.job_title ?? null,
    ni_number: r.ni_number ?? null,
  }));
  return Response.json({ data }, { status: 200 });
}

// POST /api/employees
export async function POST(req: NextRequest) {
  const companyId = getActiveCompanyId();
  if (!companyId) {
    return Response.json(
      { error: 'no active company. select a company first.' },
      { status: 400 }
    );
  }

  let body: Partial<EmployeeRow> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const row: EmployeeRow = {
    company_id: companyId,
    name: (body.name ?? '').toString().trim() || null,
    email: (body.email ?? '').toString().trim() || null,
    job_title: (body.job_title ?? '').toString().trim() || null,
    start_date: body.start_date ?? null,
    employment_type: (body.employment_type ?? null) as any,
    salary:
      typeof body.salary === 'number'
        ? body.salary
        : body.salary
        ? Number(body.salary)
        : null,
    hourly_rate:
      typeof body.hourly_rate === 'number'
        ? body.hourly_rate
        : body.hourly_rate
        ? Number(body.hourly_rate)
        : null,
    hours_per_week:
      typeof body.hours_per_week === 'number'
        ? body.hours_per_week
        : body.hours_per_week
        ? Number(body.hours_per_week)
        : null,
    ni_number: (body.ni_number ?? '').toString().trim().toUpperCase() || null,
    pay_frequency: (body.pay_frequency ?? null) as any,
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert(row)
        .select('id')
        .single();
      if (error) throw error;
      return Response.json(
        { id: data?.id },
        { status: 201, headers: { Location: `/api/employees/${data?.id}` } }
      );
    } catch {
      // fall through to local store
    }
  }

  // Fallback: dev in-memory store
  const id = await store.add(row);
  return Response.json({ id }, { status: 201 });
}
