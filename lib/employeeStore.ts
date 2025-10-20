// @ts-nocheck
// lib/employeeStore.ts
// Pathetic, but effective: process-level memory store for dev.

type NewRow = {
  company_id: string;
  name?: string | null;
  email?: string | null;
  job_title?: string | null;
  start_date?: string | null;
  employment_type?: string | null;
  salary?: number | null;
  hourly_rate?: number | null;
  hours_per_week?: number | null;
  ni_number?: string | null;
  pay_frequency?: string | null;
};

type Row = NewRow & { id: string };

// Single shared map across hot reloads
const g: any = globalThis as any;
if (!g.__EMP_STORE__) g.__EMP_STORE__ = new Map<string, Row[]>();
const DB: Map<string, Row[]> = g.__EMP_STORE__;

function uid() {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function add(row: NewRow): Promise<string> {
  const id = uid();
  const list = DB.get(row.company_id) || [];
  list.unshift({ id, ...row });
  DB.set(row.company_id, list);
  return id;
}

export async function listByCompany(companyId: string): Promise<Row[]> {
  return DB.get(companyId) || [];
}
