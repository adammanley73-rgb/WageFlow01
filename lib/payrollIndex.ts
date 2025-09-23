import { supabaseServer, getCompanyId } from '@/lib/supabaseServer';

export type Frequency = 'weekly' | 'fortnightly' | 'fourweekly' | 'monthly' | 'all';

export type PayrollRunRow = {
  id: string;
  run_number: string;
  run_name: string | null;
  frequency: 'weekly' | 'fortnightly' | 'fourweekly' | 'monthly';
  period_start: string;
  period_end: string;
  pay_date: string | null;
  archived_at: string | null;
};

function normalizeId(row: any): string {
  return String(row?.pay_run_id ?? row?.id);
}

function normalizeFreq(freq: string): 'weekly' | 'fortnightly' | 'fourweekly' | 'monthly' {
  const f = (freq || '').toLowerCase();
  if (f === 'four-weekly' || f === '4-weekly') return 'fourweekly';
  if (f === 'weekly' || f === 'fortnightly' || f === 'monthly') return f as any;
  return 'monthly';
}

/**
 * Fetch payroll runs, sorted ascending by period_start.
 * By default excludes archived runs (archived_at is null).
 */
export async function fetchPayrollRuns(filter: Frequency = 'all'): Promise<PayrollRunRow[]> {
  const sb = supabaseServer();
  const companyId = getCompanyId();
  if (!sb || !companyId) return [];

  let q = sb
    .from('payroll_runs')
    .select('pay_run_id,id,run_number,run_name,frequency,period_start,period_end,pay_date,archived_at')
    .eq('company_id', companyId)
    .is('archived_at', null)
    .order('period_start', { ascending: true, nullsFirst: true });

  if (filter && filter !== 'all') {
    q = q.eq('frequency', filter === 'fourweekly' ? 'fourweekly' : filter);
  }

  const { data, error } = await q;
  if (error || !data) return [];

  return data.map((r: any) => ({
    id: normalizeId(r),
    run_number: String(r.run_number),
    run_name: r.run_name ?? null,
    frequency: normalizeFreq(r.frequency),
    period_start: r.period_start,
    period_end: r.period_end,
    pay_date: r.pay_date ?? null,
    archived_at: r.archived_at ?? null,
  }));
}

/**
 * Count active (non-archived) runs for dashboard tiles.
 */
export async function countPayrollRuns(): Promise<number> {
  const sb = supabaseServer();
  const companyId = getCompanyId();
  if (!sb || !companyId) return 0;

  const { count, error } = await sb
    .from('payroll_runs')
    .select('pay_run_id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .is('archived_at', null);

  if (error || typeof count !== 'number') return 0;
  return count;
}

/**
 * Fetch archived runs only. Keeps sort ascending by period_start.
 */
export async function fetchArchivedRuns(): Promise<PayrollRunRow[]> {
  const sb = supabaseServer();
  const companyId = getCompanyId();
  if (!sb || !companyId) return [];

  const { data, error } = await sb
    .from('payroll_runs')
    .select('pay_run_id,id,run_number,run_name,frequency,period_start,period_end,pay_date,archived_at')
    .eq('company_id', companyId)
    .not('archived_at', 'is', null)
    .order('period_start', { ascending: true, nullsFirst: true });

  if (error || !data) return [];

  return data.map((r: any) => ({
    id: normalizeId(r),
    run_number: String(r.run_number),
    run_name: r.run_name ?? null,
    frequency: normalizeFreq(r.frequency),
    period_start: r.period_start,
    period_end: r.period_end,
    pay_date: r.pay_date ?? null,
    archived_at: r.archived_at ?? null,
  }));
}
