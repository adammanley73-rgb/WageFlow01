// C:\Projects\wageflow01\app\dashboard\reports\page.tsx

import PageTemplate from "@/components/layout/PageTemplate";
import ActiveCompanyBanner from "@/components/ui/ActiveCompanyBanner";
import { getServerSupabase } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import { formatMoney } from "@/lib/formatMoney";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

type PayrollRunRow = {
  id: string;
  run_name?: string | null;
  run_number?: string | null;
  pay_date?: string | null;
  status?: string | null;
  total_gross_pay?: number | null;
  total_net_pay?: number | null;
  total_tax?: number | null;
  total_ni?: number | null;
};

type RtiLogRow = {
  id: string;
  pay_run_id?: string | null;
  type?: string | null;
  period?: string | null;
  submitted_at?: string | null;
  reference?: string | null;
  status?: string | null;
  message?: string | null;
};

type ReportsData = {
  payrollRuns: PayrollRunRow[];
  rtiLogs: RtiLogRow[];
  payrollRunCount: number;
  totalGross: number;
  totalDeductions: number;
  loadError: string | null;
};

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    String(s || "").trim()
  );
}

async function getActiveCompanyId(): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get("active_company_id")?.value ?? jar.get("company_id")?.value ?? null;

  if (!v) return null;

  const trimmed = String(v).trim();
  return isUuid(trimmed) ? trimmed : null;
}

function toNumberSafe(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value: string | null | undefined) {
  const s = String(value || "").trim();
  if (!s) return "—";

  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatDateTime(value: string | null | undefined) {
  const s = String(value || "").trim();
  if (!s) return "—";

  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatStatus(value: string | null | undefined) {
  const s = String(value || "").trim().toLowerCase();
  if (!s) return "—";
  if (s === "rti_submitted") return "RTI submitted";
  return s.replaceAll("_", " ");
}

function deriveRunLabel(run: PayrollRunRow) {
  const runNumber = String(run.run_number || "").trim();
  if (runNumber) return runNumber;

  const runName = String(run.run_name || "").trim();
  if (runName) return runName;

  return "—";
}

function deriveRunDeductions(run: PayrollRunRow) {
  const gross = toNumberSafe(run.total_gross_pay);
  const net = toNumberSafe(run.total_net_pay);
  const deductions = gross - net;
  return deductions > 0 ? deductions : 0;
}

function StatValue(props: { label: string; value: string | number }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center text-center">
      <div className="text-sm font-semibold text-neutral-900">{props.label}</div>
      <div className={inter.className + " mt-2 text-[27px] leading-none font-semibold"}>{props.value}</div>
    </div>
  );
}

function StatTile(props: { label: string; value: string | number }) {
  return (
    <div
      className="h-full rounded-2xl ring-1 border bg-neutral-300 ring-neutral-400 border-neutral-400 p-4"
      style={{ backgroundColor: "#d4d4d4" }}
    >
      <StatValue label={props.label} value={props.value} />
    </div>
  );
}

async function getReportsData(companyId: string): Promise<ReportsData> {
  const supabase = await getServerSupabase();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  if (userErr || !user) {
    return {
      payrollRuns: [],
      rtiLogs: [],
      payrollRunCount: 0,
      totalGross: 0,
      totalDeductions: 0,
      loadError: "Sign in required.",
    };
  }

  const { data: membership, error: memErr } = await supabase
    .from("company_memberships")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr || !membership) {
    return {
      payrollRuns: [],
      rtiLogs: [],
      payrollRunCount: 0,
      totalGross: 0,
      totalDeductions: 0,
      loadError: "You do not have access to the active company.",
    };
  }

  const [runsRes, logsRes] = await Promise.all([
    supabase
      .from("payroll_runs")
      .select("id, run_name, run_number, pay_date, status, total_gross_pay, total_net_pay, total_tax, total_ni")
      .eq("company_id", companyId)
      .order("pay_date", { ascending: false })
      .limit(100),
    supabase
      .from("rti_logs")
      .select("id, pay_run_id, type, period, submitted_at, reference, status, message")
      .eq("company_id", companyId)
      .order("submitted_at", { ascending: false })
      .limit(100),
  ]);

  if (runsRes.error) {
    return {
      payrollRuns: [],
      rtiLogs: [],
      payrollRunCount: 0,
      totalGross: 0,
      totalDeductions: 0,
      loadError: runsRes.error.message || "Failed to load payroll runs.",
    };
  }

  if (logsRes.error) {
    return {
      payrollRuns: Array.isArray(runsRes.data) ? (runsRes.data as PayrollRunRow[]) : [],
      rtiLogs: [],
      payrollRunCount: Array.isArray(runsRes.data) ? runsRes.data.length : 0,
      totalGross: Array.isArray(runsRes.data)
        ? runsRes.data.reduce((sum, run) => sum + toNumberSafe((run as PayrollRunRow).total_gross_pay), 0)
        : 0,
      totalDeductions: Array.isArray(runsRes.data)
        ? runsRes.data.reduce((sum, run) => sum + deriveRunDeductions(run as PayrollRunRow), 0)
        : 0,
      loadError: logsRes.error.message || "Failed to load RTI logs.",
    };
  }

  const payrollRuns = Array.isArray(runsRes.data) ? (runsRes.data as PayrollRunRow[]) : [];
  const rtiLogs = Array.isArray(logsRes.data) ? (logsRes.data as RtiLogRow[]) : [];

  const payrollRunCount = payrollRuns.length;
  const totalGross = payrollRuns.reduce((sum, run) => sum + toNumberSafe(run.total_gross_pay), 0);
  const totalDeductions = payrollRuns.reduce((sum, run) => sum + deriveRunDeductions(run), 0);

  return {
    payrollRuns,
    rtiLogs,
    payrollRunCount,
    totalGross,
    totalDeductions,
    loadError: null,
  };
}

export default async function ReportsPage() {
  const activeCompanyId = await getActiveCompanyId();

  if (!activeCompanyId) {
    return (
      <PageTemplate title="Reports" currentSection="Reports">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <ActiveCompanyBanner />

          <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
            <div className="text-sm font-semibold text-neutral-900">No active company selected</div>
            <div className="mt-1 text-sm text-neutral-700">Select a company on the Dashboard, then come back here.</div>
          </div>
        </div>
      </PageTemplate>
    );
  }

  if (!isUuid(activeCompanyId)) {
    return (
      <PageTemplate title="Reports" currentSection="Reports">
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <ActiveCompanyBanner />

          <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
            <div className="text-sm font-semibold text-neutral-900">Invalid active company</div>
            <div className="mt-1 text-sm text-neutral-700">Re-select your company on the Dashboard.</div>
          </div>
        </div>
      </PageTemplate>
    );
  }

  const data = await getReportsData(activeCompanyId);

  return (
    <PageTemplate title="Reports" currentSection="Reports">
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <ActiveCompanyBanner />

        {data.loadError ? (
          <div className="rounded-xl bg-white ring-1 ring-neutral-300 p-6">
            <div className="text-sm font-semibold text-neutral-900">Reports unavailable</div>
            <div className="mt-1 text-sm text-neutral-700">{data.loadError}</div>
          </div>
        ) : null}

        <div className="rounded-2xl bg-neutral-100 ring-1 ring-neutral-300 p-3 sm:p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <StatTile label="Payroll Runs" value={data.payrollRunCount} />
            <StatTile label="Total Gross" value={formatMoney(data.totalGross)} />
            <StatTile label="Total Deductions" value={formatMoney(data.totalDeductions)} />
          </div>

          <div className="rounded-xl bg-white ring-1 ring-neutral-200 overflow-hidden">
            <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50 text-sm font-semibold text-neutral-900">
              Payroll Summary
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-100">
                  <tr className="border-b-2 border-neutral-300">
                    <th className="text-left px-4 py-3">Run Number</th>
                    <th className="text-left px-4 py-3">Pay Date</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Gross</th>
                    <th className="text-left px-4 py-3">Deductions</th>
                    <th className="text-left px-4 py-3">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payrollRuns.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-neutral-700" colSpan={6}>
                        No payroll runs found for the active company.
                      </td>
                    </tr>
                  ) : (
                    data.payrollRuns.map((run) => (
                      <tr key={run.id} className="border-b border-neutral-200 last:border-b-0">
                        <td className="px-4 py-3 text-neutral-900">{deriveRunLabel(run)}</td>
                        <td className="px-4 py-3 text-neutral-900">{formatDate(run.pay_date)}</td>
                        <td className="px-4 py-3 text-neutral-900 capitalize">{formatStatus(run.status)}</td>
                        <td className="px-4 py-3 text-neutral-900">{formatMoney(toNumberSafe(run.total_gross_pay))}</td>
                        <td className="px-4 py-3 text-neutral-900">{formatMoney(deriveRunDeductions(run))}</td>
                        <td className="px-4 py-3 text-neutral-900">{formatMoney(toNumberSafe(run.total_net_pay))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl bg-white ring-1 ring-neutral-200 overflow-hidden mt-4">
            <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50 text-sm font-semibold text-neutral-900">
              RTI Submission Log
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-100">
                  <tr className="border-b-2 border-neutral-300">
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Period</th>
                    <th className="text-left px-4 py-3">Submitted</th>
                    <th className="text-left px-4 py-3">Reference</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rtiLogs.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-neutral-700" colSpan={6}>
                        No submissions logged yet. Submit or mark RTI from a payroll run to populate this table.
                      </td>
                    </tr>
                  ) : (
                    data.rtiLogs.map((log) => (
                      <tr key={log.id} className="border-b border-neutral-200 last:border-b-0">
                        <td className="px-4 py-3 text-neutral-900">{String(log.type || "—")}</td>
                        <td className="px-4 py-3 text-neutral-900">{String(log.period || "—")}</td>
                        <td className="px-4 py-3 text-neutral-900">{formatDateTime(log.submitted_at)}</td>
                        <td className="px-4 py-3 text-neutral-900">{String(log.reference || "—")}</td>
                        <td className="px-4 py-3 text-neutral-900 capitalize">{formatStatus(log.status)}</td>
                        <td className="px-4 py-3 text-neutral-900">{String(log.message || "—")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}