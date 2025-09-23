export const dynamic = 'force-dynamic';

import Image from 'next/image';
import Link from 'next/link';
import { getAdmin } from '@/lib/supabaseServer';

const CHIP = 'w-32 text-center rounded-full bg-blue-700 px-5 py-2 text-sm font-medium text-white';
const CARD = 'rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6';

type Emp = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  ni_number: string | null;
  pay_type: string | null;
  frequency: string | null;
  annual_salary: number | null;
  hours_per_week: number | null;
  tax_code: string | null;
};

export default async function EditHub({ params }: { params: { id: string } }) {
  const { client, companyId } = getAdmin();

  const { data: emp } = await client
    .from('employees')
    .select(
      'id, first_name, last_name, email, ni_number, pay_type, frequency, annual_salary, hours_per_week, tax_code'
    )
    .eq('id', params.id)
    .eq('company_id', companyId)
    .maybeSingle();

  const { data: starter } = await client
    .from('employee_starter_details')
    .select('p45_provided, starter_declaration, student_loan_plan, postgraduate_loan, updated_at')
    .eq('employee_id', params.id)
    .eq('company_id', companyId)
    .maybeSingle();

  const { data: p45 } = await client
    .from('employee_p45_details')
    .select('tax_code, tax_basis, prev_pay_to_date, prev_tax_to_date, leaving_date, employer_paye_ref, updated_at')
    .eq('employee_id', params.id)
    .eq('company_id', companyId)
    .maybeSingle();

  const { data: bank } = await client
    .from('employee_bank_accounts')
    .select('account_name, sort_code, account_number, updated_at')
    .eq('employee_id', params.id)
    .eq('company_id', companyId)
    .maybeSingle();

  const { data: emer } = await client
    .from('employee_emergency_contacts')
    .select('contact_name, relationship, phone, email, updated_at')
    .eq('employee_id', params.id)
    .eq('company_id', companyId)
    .maybeSingle();

  const e = emp as Emp | null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-300 via-teal-400 to-blue-600 font-[var(--font-manrope,inherit)]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-6 rounded-xl bg-white px-6 py-6 ring-1 ring-neutral-200">
          <div className="flex items-center gap-4">
            <Image src="/WageFlowLogo.png" alt="WageFlow" width={64} height={64} priority />
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-blue-800">Edit Employee</h1>
              <div className="text-neutral-600">{e ? `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() : ''}</div>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-3">
            <a href="/dashboard" className={CHIP}>Dashboard</a>
            <a href="/dashboard/employees" className={CHIP}>Employees</a>
            <a href="/dashboard/payroll" className={CHIP}>Payroll</a>
            <a href="/dashboard/absence" className={CHIP}>Absence</a>
          </nav>
        </div>

        {/* Summary */}
        <div className={`${CARD} mb-6`}>
          <div className="mb-4 text-xl font-semibold">Summary</div>
          {e ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3">
              <div>
                <div className="text-neutral-700">Email</div>
                <div>{e.email ?? '—'}</div>
              </div>
              <div>
                <div className="text-neutral-700">NI number</div>
                <div>{e.ni_number ?? '—'}</div>
              </div>
              <div>
                <div className="text-neutral-700">Frequency</div>
                <div>{e.frequency ?? '—'}</div>
              </div>
              <div>
                <div className="text-neutral-700">Pay type</div>
                <div>{e.pay_type ?? '—'}</div>
              </div>
              <div>
                <div className="text-neutral-700">Annual salary</div>
                <div>{e.annual_salary != null ? `£${e.annual_salary}` : '—'}</div>
              </div>
              <div>
                <div className="text-neutral-700">Hours per week</div>
                <div>{e.hours_per_week != null ? `${e.hours_per_week}` : '—'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-neutral-700">Tax code</div>
                <div>{e.tax_code ?? '—'}</div>
              </div>
            </div>
          ) : (
            <div>Employee not found.</div>
          )}
          <div className="mt-4">
            <Link href={`/dashboard/employees/${params.id}/edit/details`} className="rounded-lg bg-blue-700 text-white px-4 py-2">
              Edit details
            </Link>
          </div>
        </div>

        {/* Next steps */}
        <div className={`${CARD} mb-6`}>
          <div className="mb-4 text-xl font-semibold">Next steps</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`${CARD}`}>
              <div className="mb-2 font-semibold">Starter details</div>
              {starter ? (
                starter.p45_provided ? (
                  <div className="text-sm">P45 provided. Fill P45 details.</div>
                ) : starter.starter_declaration ? (
                  <div className="text-sm">Declaration {starter.starter_declaration}. Student loan {starter.student_loan_plan ?? 'None'}. {starter.postgraduate_loan ? 'PG loan' : ''}</div>
                ) : (
                  <div className="text-sm">Saved, no declaration.</div>
                )
              ) : (
                <div className="text-sm">No starter details saved yet.</div>
              )}
              <Link href={`/dashboard/employees/${params.id}/wizard/starter`} className="mt-3 inline-block rounded-lg bg-blue-700 text-white px-4 py-2">
                Starter details
              </Link>
            </div>

            <div className={`${CARD}`}>
              <div className="mb-2 font-semibold">Bank details</div>
              {bank ? (
                <div className="text-sm">
                  {bank.account_name ?? '—'}<br />
                  {bank.sort_code ? bank.sort_code.replace(/(\d{2})(\d{2})(\d{2})/, '$1-$2-$3') : '—'} • {bank.account_number ?? '—'}
                </div>
              ) : (
                <div className="text-sm">No bank details saved yet.</div>
              )}
              <Link href={`/dashboard/employees/${params.id}/wizard/bank`} className="mt-3 inline-block rounded-lg bg-blue-700 text-white px-4 py-2">
                Bank details
              </Link>
            </div>

            <div className={`${CARD}`}>
              <div className="mb-2 font-semibold">Emergency contact</div>
              {emer ? (
                <div className="text-sm">
                  {emer.contact_name ?? '—'} • {emer.relationship ?? '—'}<br />
                  {emer.phone ?? '—'} {emer.email ? `• ${emer.email}` : ''}
                </div>
              ) : (
                <div className="text-sm">No emergency contact saved yet.</div>
              )}
              <Link href={`/dashboard/employees/${params.id}/wizard/emergency`} className="mt-3 inline-block rounded-lg bg-blue-700 text-white px-4 py-2">
                Emergency contact
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 font-semibold">P45 details</div>
            {p45 ? (
              <div className="text-sm">
                Code {p45.tax_code} • Basis {p45.tax_basis}
                {p45.prev_pay_to_date != null ? <> • Prev pay £{p45.prev_pay_to_date}</> : null}
                {p45.prev_tax_to_date != null ? <> • Prev tax £{p45.prev_tax_to_date}</> : null}
              </div>
            ) : (
              <div className="text-sm">No P45 details saved yet.</div>
            )}
            <Link href={`/dashboard/employees/${params.id}/wizard/p45`} className="mt-3 inline-block rounded-lg bg-blue-700 text-white px-4 py-2">
              P45 details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
