/* @ts-nocheck */
export const dynamic = 'force-dynamic';

import Image from 'next/image';
import Link from 'next/link';
import { getAdmin } from '@/lib/supabaseServer';
import { deleteEmployeeAction } from './actions';

type Row = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  ni_number: string | null;
  pay_type: string | null;
  frequency: string | null;
  created_at: string | null;
  run_count?: number | null;
};

const CHIP =
  'w-32 text-center rounded-full bg-blue-700 px-5 py-2 text-sm font-medium text-white';
const CARD =
  'rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6';
const TH = 'text-left text-sm font-semibold text-neutral-900 py-3';
const TD = 'py-3 text-sm text-neutral-900';

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: { m?: string; d?: string };
}) {
  const { client, companyId } = getAdmin();

  // Prefer counts view if present
  let rows: Row[] = [];
  const { data: withCounts } = await client
    .from('employees')
    .select(
      'id, first_name, last_name, email, ni_number, pay_type, frequency, created_at, employee_run_counts!left(run_count)'
    )
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });

  if (withCounts && withCounts.length) {
    rows = (withCounts as any[]).map((r) => ({
      id: r.id,
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      ni_number: r.ni_number,
      pay_type: r.pay_type,
      frequency: r.frequency,
      created_at: r.created_at,
      run_count: r.employee_run_counts?.[0]?.run_count ?? 0,
    }));
  } else {
    const { data } = await client
      .from('employees')
      .select(
        'id, first_name, last_name, email, ni_number, pay_type, frequency, created_at'
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });
    rows = (data ?? []).map((r) => ({ ...r, run_count: 0 })) as Row[];
  }

  const m = searchParams?.m;
  const d = searchParams?.d;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-300 via-teal-400 to-blue-600 font-[var(--font-manrope,inherit)]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header banner */}
        <div className="mb-6 flex items-center justify-between gap-6 rounded-xl bg-white px-6 py-6 ring-1 ring-neutral-200">
          <div className="flex items-center gap-4">
            <Image
              src="/WageFlowLogo.png"
              alt="WageFlow"
              width={64}
              height={64}
              priority
            />
            <h1 className="text-4xl font-bold tracking-tight text-blue-800">
              Employees
            </h1>
          </div>
          <nav className="flex flex-wrap items-center gap-3">
            {/* Hide Employees chip on this page */}
            <a href="/dashboard" className={CHIP}>
              Dashboard
            </a>
            <a href="/dashboard/payroll" className={CHIP}>
              Payroll
            </a>
            <a href="/dashboard/absence" className={CHIP}>
              Absence
            </a>
            {/* Settings appears only on Dashboard */}
          </nav>
        </div>

        {/* Feedback banners */}
        {m === 'deleted' && <Banner kind="ok" text="Employee deleted." />}
        {m === 'in_use' && (
          <Banner kind="warn" text="Cannot delete. Employee appears in pay runs." />
        )}
        {m === 'missing' && <Banner kind="warn" text="Missing employee id." />}
        {m === 'error' && (
          <Banner
            kind="err"
            text={`Delete failed${d ? `: ${decodeURIComponent(d)}` : ''}.`}
          />
        )}

        {/* List card */}
        <div className={CARD}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">
              Manage staff records and starter details.
            </div>
            <Link
              href="/dashboard/employees/new"
              className="rounded-lg bg-blue-700 text-white px-4 py-2"
            >
              Create employee
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-neutral-400">
                  <th className={TH}>Name</th>
                  <th className={TH}>Email</th>
                  <th className={TH}>NI</th>
                  <th className={TH}>Pay type</th>
                  <th className={TH}>Frequency</th>
                  <th className={TH}>In runs</th>
                  <th className={TH}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const disableDelete = (e.run_count ?? 0) > 0;
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-neutral-400 last:border-0"
                    >
                      <td className={TD}>
                        <div className="font-medium">
                          {e.first_name} {e.last_name}
                        </div>
                        <div className="text-xs">
                          {e.created_at
                            ? new Date(e.created_at).toLocaleDateString()
                            : 'â€”'}
                        </div>
                      </td>
                      <td className={TD}>{e.email ?? 'â€”'}</td>
                      <td className={TD}>{e.ni_number ?? 'â€”'}</td>
                      <td className={TD}>{e.pay_type ?? 'â€”'}</td>
                      <td className={TD}>{e.frequency ?? 'â€”'}</td>
                      <td className={TD}>{e.run_count ?? 0}</td>
                      <td className={TD}>
                        <div className="flex gap-2">
                          <Link
                            href={`/dashboard/employees/${e.id}/edit`}
                            className="rounded-md bg-green-600 text-white px-3 py-1"
                          >
                            Edit
                          </Link>

                          {disableDelete ? (
                            <button
                              disabled
                              className="rounded-md px-3 py-1 bg-neutral-400 text-white cursor-not-allowed"
                              title="In runs. Cannot delete."
                            >
                              Delete
                            </button>
                          ) : (
                            <form action={deleteEmployeeAction}>
                              <input type="hidden" name="id" value={e.id} />
                              <button
                                type="submit"
                                className="rounded-md px-3 py-1 bg-red-600 text-white"
                                title="Delete employee"
                              >
                                Delete
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td className="py-8 text-center text-neutral-900" colSpan={7}>
                      No employees yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Banner({
  kind,
  text,
}: {
  kind: 'ok' | 'warn' | 'err';
  text: string;
}) {
  const base = 'mt-4 mb-2 px-3 py-2 rounded-md text-sm';
  const cls =
    kind === 'ok'
      ? `${base} bg-green-100 text-green-800`
      : kind === 'warn'
      ? `${base} bg-amber-100 text-amber-800`
      : `${base} bg-red-100 text-red-800`;
  return <div className={cls}>{text}</div>;
}

