'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../../lib/supabase'; // from /app/dashboard/payroll/[id]/payslip/[employeeId]/page.tsx
import { PageShell, Header, Button, LinkButton } from '../../../../../../components/ui/wf-ui';

type CompanySettings = {
  id: string;
  company_name: string | null;
  paye_reference: string | null;
  accounts_office_reference: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postcode?: string | null;
};

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  employee_number?: string | null;
};

type PayRun = {
  id: string;
  run_number: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  frequency: string;
};

type PayRunEmployee = {
  id: string;
  run_id: string;
  employee_id: string;
  tax: number | null;
  ni: number | null;
  pension_employee: number | null;
  pension_employer: number | null;
  gross_pay: number | null;
  net_pay: number | null;
};

const S = {
  sheet: {
    marginTop: '12px',
    background: 'white',
    borderRadius: '1rem',
    padding: '16px',
  } as CSSProperties,
  header: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '12px',
    borderBottom: '1px solid rgba(0,0,0,0.08)',
    paddingBottom: '12px',
    marginBottom: '12px',
  } as CSSProperties,
  companyBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  } as CSSProperties,
  companyName: {
    fontSize: 18,
    fontWeight: 900,
  } as CSSProperties,
  companyMeta: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.7)',
  } as CSSProperties,
  payslipTitle: {
    textAlign: 'right',
    fontWeight: 800,
    fontSize: 18,
  } as CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  } as CSSProperties,
  block: {
    background: 'rgba(0,0,0,0.03)',
    borderRadius: 10,
    padding: '12px',
  } as CSSProperties,
  row: {
    display: 'grid',
    gridTemplateColumns: '140px 1fr',
    gap: 8,
    fontSize: 14,
    marginBottom: 6,
  } as CSSProperties,
  label: {
    color: 'rgba(0,0,0,0.65)',
  } as CSSProperties,
  value: {
    fontWeight: 700,
  } as CSSProperties,
  totalsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 12,
    marginTop: 12,
  } as CSSProperties,
  num: {
    fontWeight: 900,
  } as CSSProperties,
  printBar: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 12,
  } as CSSProperties,
};

function gbDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('en-GB');
  } catch {
    return d;
  }
}

export default function PayslipPage() {
  const params = useParams<{ id: string; employeeId: string }>();
  const runId = params?.id as string;
  const employeeId = params?.employeeId as string;

  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [run, setRun] = useState<PayRun | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [line, setLine] = useState<PayRunEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setErr(null);
        setLoading(true);

        // 1) Company settings
        const { data: companyData, error: compErr } = await supabase
          .from('company_settings')
          .select(
            'id, company_name, paye_reference, accounts_office_reference, address_line1, address_line2, city, postcode'
          )
          .limit(1)
          .single();
        if (compErr) throw compErr;

        // 2) Run
        const { data: runData, error: runErr } = await supabase
          .from('pay_runs')
          .select('id, run_number, period_start, period_end, pay_date, frequency')
          .eq('id', runId)
          .single();
        if (runErr) throw runErr;

        // 3) Employee
        const { data: empData, error: empErr } = await supabase
          .from('employees')
          .select('id, first_name, last_name, employee_number')
          .eq('id', employeeId)
          .single();
        if (empErr) throw empErr;

        // 4) Pay-run line for the employee
        const { data: lineData, error: lineErr } = await supabase
          .from('pay_run_employees')
          .select(
            'id, run_id, employee_id, tax, ni, pension_employee, pension_employer, gross_pay, net_pay'
          )
          .eq('run_id', runId)
          .eq('employee_id', employeeId)
          .single();
        if (lineErr) throw lineErr;

        if (!mounted) return;
        setCompany(companyData as CompanySettings);
        setRun(runData as PayRun);
        setEmployee(empData as Employee);
        setLine(lineData as PayRunEmployee);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message ?? 'Failed to load payslip');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [runId, employeeId]);

  const companyAddress = useMemo(() => {
    if (!company) return '';
    const parts = [
      company.address_line1,
      company.address_line2,
      company.city,
      company.postcode,
    ]
      .filter(Boolean)
      .join(', ');
    return parts;
  }, [company]);

  return (
    <PageShell>
      <Header
        title="Payslip"
        subtitle="Printable payslip. Use the Print button to save as PDF."
        actions={
          <>
            <LinkButton href={`/dashboard/payroll/${runId}`} variant="secondary">
              Back to run
            </LinkButton>
            <Button onClick={() => window.print()} variant="primary">
              Print
            </Button>
          </>
        }
      />

      {err ? (
        <div
          style={{
            padding: '12px 16px',
            marginTop: 12,
            borderRadius: 8,
            background: 'rgba(220,38,38,0.08)',
            color: '#991b1b',
            fontWeight: 600,
          }}
        >
          {err}
        </div>
      ) : null}

      <div style={S.sheet}>
        {/* Branded header from company_settings */}
        <div style={S.header}>
          <div style={S.companyBlock}>
            <div style={S.companyName}>
              {company?.company_name ?? 'Company name'}
            </div>
            <div style={S.companyMeta}>
              {companyAddress || 'Company address'}
            </div>
            <div style={S.companyMeta}>
              PAYE ref: {company?.paye_reference ?? '—'}
            </div>
            <div style={S.companyMeta}>
              Accounts Office ref: {company?.accounts_office_reference ?? '—'}
            </div>
          </div>
          <div style={S.payslipTitle}>
            Payslip
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.65)' }}>
              {run
                ? `${gbDate(run.period_start)} to ${gbDate(run.period_end)} · Pay date ${gbDate(run.pay_date)}`
                : '—'}
            </div>
          </div>
        </div>

        {/* Employee & Run summary */}
        <div style={S.grid}>
          <div style={S.block}>
            <div style={S.row}>
              <div style={S.label}>Employee</div>
              <div style={S.value}>
                {employee ? `${employee.first_name} ${employee.last_name}` : '—'}
              </div>
            </div>
            <div style={S.row}>
              <div style={S.label}>Employee No</div>
              <div style={S.value}>{employee?.employee_number ?? '—'}</div>
            </div>
            <div style={S.row}>
              <div style={S.label}>Pay frequency</div>
              <div style={S.value}>{run?.frequency ?? '—'}</div>
            </div>
          </div>

          <div style={S.block}>
            <div style={S.row}>
              <div style={S.label}>Run</div>
              <div style={S.value}>{run?.run_number ?? runId}</div>
            </div>
            <div style={S.row}>
              <div style={S.label}>Period</div>
              <div style={S.value}>
                {run ? `${gbDate(run.period_start)} to ${gbDate(run.period_end)}` : '—'}
              </div>
            </div>
            <div style={S.row}>
              <div style={S.label}>Pay date</div>
              <div style={S.value}>{run ? gbDate(run.pay_date) : '—'}</div>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div style={S.totalsRow}>
          <div style={S.block}>
            <div style={S.label}>Gross pay</div>
            <div className="wf-num" style={S.num}>
              {line?.gross_pay != null ? `£${(line.gross_pay as number).toFixed(2)}` : '—'}
            </div>
          </div>
          <div style={S.block}>
            <div style={S.label}>Total deductions</div>
            <div className="wf-num" style={S.num}>
              {line
                ? `£${(
                    (line.tax ?? 0) +
                    (line.ni ?? 0) +
                    (line.pension_employee ?? 0)
                  ).toFixed(2)}`
                : '—'}
            </div>
          </div>
          <div style={S.block}>
            <div style={S.label}>Net pay</div>
            <div className="wf-num" style={S.num}>
              {line?.net_pay != null ? `£${(line.net_pay as number).toFixed(2)}` : '—'}
            </div>
          </div>
        </div>

        {/* Print toolbar for mobile */}
        <div style={S.printBar}>
          <Button variant="primary" onClick={() => window.print()}>Print</Button>
        </div>
      </div>

      {/* Print styles */}
      <style>
        {`
          @media print {
            /* Hide app chrome from Header actions during print */
            a, button { display: none !important; }
            /* Remove PageShell padding for print */
            body, html { background: #fff !important; }
          }
        `}
      </style>
    </PageShell>
  );
}
