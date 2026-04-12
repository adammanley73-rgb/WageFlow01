"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageTemplate from "@/components/layout/PageTemplate";
import ActiveCompanyBannerClient from "@/components/ui/ActiveCompanyBannerClient";

type ActiveCompany = { id?: string; name?: string } | null;

type EmployeeListRow = {
  id?: string | null;
  employee_id?: string | null;
  employee_number?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  job_title?: string | null;
};

interface FormState {
  contract_number: string;
  job_title: string;
  department: string;
  start_date: string;
  leave_date: string;
  pay_frequency: string;
  pay_basis: string;
  annual_salary: string;
  hourly_rate: string;
  hours_per_week: string;
  pay_after_leaving: boolean;

  pension_enabled: boolean;
  pension_status: string;
  pension_scheme_name: string;
  pension_reference: string;
  pension_contribution_method: string;
  pension_earnings_basis: string;
  pension_employee_rate: string;
  pension_employer_rate: string;
  pension_worker_category: string;
  pension_enrolment_date: string;
  pension_opt_in_date: string;
  pension_opt_out_date: string;
  pension_postponement_date: string;
}

const WEEKS_PER_YEAR = 52.14285714;

type PaySource = "salary" | "hourly" | null;

function toNumberOrNull(v: string) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function moneyRound(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function fmtMoney(n: number) {
  return moneyRound(n).toFixed(2).replace(/\.?0+$/, "");
}

function isJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json");
}

function displayEmployeeName(emp: EmployeeListRow | null) {
  if (!emp) return "Employee";
  const full = `${String(emp.first_name ?? "").trim()} ${String(emp.last_name ?? "").trim()}`.trim();
  return full || "Employee";
}

export default function NewEmployeeContractPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const routeId = String(params?.id ?? "").trim();

  const [company, setCompany] = useState<ActiveCompany>(null);
  const [companyErr, setCompanyErr] = useState<string | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  const [employee, setEmployee] = useState<EmployeeListRow | null>(null);
  const [employeeLoading, setEmployeeLoading] = useState(true);
  const [employeeErr, setEmployeeErr] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    contract_number: "",
    job_title: "",
    department: "",
    start_date: "",
    leave_date: "",
    pay_frequency: "monthly",
    pay_basis: "salary",
    annual_salary: "",
    hourly_rate: "",
    hours_per_week: "",
    pay_after_leaving: false,

    pension_enabled: false,
    pension_status: "enrolled",
    pension_scheme_name: "",
    pension_reference: "",
    pension_contribution_method: "relief_at_source",
    pension_earnings_basis: "qualifying_earnings",
    pension_employee_rate: "",
    pension_employer_rate: "",
    pension_worker_category: "eligible_jobholder",
    pension_enrolment_date: "",
    pension_opt_in_date: "",
    pension_opt_out_date: "",
    pension_postponement_date: "",
  });

  const [paySource, setPaySource] = useState<PaySource>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadActiveCompany() {
      setCompanyLoading(true);

      try {
        setCompanyErr(null);

        const res = await fetch("/api/active-company", { cache: "no-store" });
        if (ignore) return;

        if (res.status === 204) {
          setCompany(null);
          setCompanyErr("No active company selected.");
          return;
        }

        const data = await res.json().catch(() => ({} as any));
        if (ignore) return;

        if (res.ok) {
          if (data?.ok && data?.company) {
            setCompany(data.company);
            return;
          }
          if (data?.id && (data?.name || data?.name === null)) {
            setCompany({ id: data.id, name: data.name ?? null });
            return;
          }
          if (data?.company_id && data?.company_name) {
            setCompany({ id: data.company_id, name: data.company_name });
            return;
          }

          setCompany(null);
          setCompanyErr("No active company selected.");
          return;
        }

        setCompany(null);
        setCompanyErr(data?.error || "No active company selected.");
      } catch {
        if (ignore) return;
        setCompany(null);
        setCompanyErr("Could not load active company.");
      } finally {
        if (ignore) return;
        setCompanyLoading(false);
      }
    }

    loadActiveCompany();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadEmployee() {
      if (!routeId) {
        setEmployee(null);
        setEmployeeErr("Employee id is missing from the route.");
        setEmployeeLoading(false);
        return;
      }

      if (companyErr || !company?.id) {
        setEmployee(null);
        setEmployeeLoading(false);
        return;
      }

      setEmployeeLoading(true);
      setEmployeeErr(null);

      try {
        const res = await fetch("/api/employees", { cache: "no-store" });
        const data = await res.json().catch(() => ({} as any));

        if (ignore) return;

        if (!res.ok || !data?.ok || !Array.isArray(data?.employees)) {
          setEmployee(null);
          setEmployeeErr(data?.error || "Could not load employee.");
          return;
        }

        const match = (data.employees as EmployeeListRow[]).find((row) => {
          const id = String(row?.id ?? "").trim();
          const employeeId = String(row?.employee_id ?? "").trim();
          const employeeNumber = String(row?.employee_number ?? "").trim();

          return routeId === id || routeId === employeeId || routeId === employeeNumber;
        });

        if (!match) {
          setEmployee(null);
          setEmployeeErr("Employee not found.");
          return;
        }

        setEmployee(match);

        setForm((prev) => ({
          ...prev,
          job_title: prev.job_title || String(match.job_title ?? "").trim(),
        }));
      } catch {
        if (ignore) return;
        setEmployee(null);
        setEmployeeErr("Could not load employee.");
      } finally {
        if (ignore) return;
        setEmployeeLoading(false);
      }
    }

    loadEmployee();

    return () => {
      ignore = true;
    };
  }, [company?.id, companyErr, routeId]);

  useEffect(() => {
    const hours = toNumberOrNull(form.hours_per_week);
    if (!hours || hours <= 0) return;

    const salary = toNumberOrNull(form.annual_salary);
    const hourly = toNumberOrNull(form.hourly_rate);

    if (paySource === "salary" || form.pay_basis === "salary") {
      if (salary !== null && salary > 0) {
        const derivedHourly = salary / (hours * WEEKS_PER_YEAR);
        const next = fmtMoney(derivedHourly);
        if (String(form.hourly_rate || "").trim() !== next) {
          setForm((prev) => ({ ...prev, hourly_rate: next }));
        }
      }
      return;
    }

    if (paySource === "hourly" || form.pay_basis === "hourly") {
      if (hourly !== null && hourly > 0) {
        const derivedSalary = hourly * hours * WEEKS_PER_YEAR;
        const next = fmtMoney(derivedSalary);
        if (String(form.annual_salary || "").trim() !== next) {
          setForm((prev) => ({ ...prev, annual_salary: next }));
        }
      }
    }
  }, [form.annual_salary, form.hourly_rate, form.hours_per_week, form.pay_basis, paySource]);

  const employeeName = useMemo(() => displayEmployeeName(employee), [employee]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (companyErr || !company?.id) {
      setErr("No active company selected. Go back to Dashboard and select your company first.");
      return;
    }

    if (employeeErr || !employee?.id) {
      setErr("Employee could not be resolved for contract creation.");
      return;
    }

    const startDate = String(form.start_date || "").trim();
    if (!startDate) {
      setErr("Contract start date is required.");
      return;
    }

    const payFrequency = String(form.pay_frequency || "").trim();
    if (!payFrequency) {
      setErr("Pay frequency is required.");
      return;
    }

    const payBasis = String(form.pay_basis || "").trim();
    if (!payBasis) {
      setErr("Pay basis is required.");
      return;
    }

    const hours = toNumberOrNull(form.hours_per_week);
    if (hours === null || hours <= 0) {
      setErr("Hours per week is required.");
      return;
    }

    const annualSalary = toNumberOrNull(form.annual_salary);
    const hourlyRate = toNumberOrNull(form.hourly_rate);

    if (payBasis === "salary" && (annualSalary === null || annualSalary <= 0)) {
      setErr("Annual salary is required for a salary-based contract.");
      return;
    }

    if (payBasis === "hourly" && (hourlyRate === null || hourlyRate <= 0)) {
      setErr("Hourly rate is required for an hourly contract.");
      return;
    }

    const pensionEmployeeRate = toNumberOrNull(form.pension_employee_rate);
    const pensionEmployerRate = toNumberOrNull(form.pension_employer_rate);

    if (form.pension_enabled) {
      if (!String(form.pension_scheme_name || "").trim()) {
        setErr("Pension scheme name is required when pension is enabled.");
        return;
      }

      if (!String(form.pension_contribution_method || "").trim()) {
        setErr("Pension contribution method is required when pension is enabled.");
        return;
      }

      if (!String(form.pension_earnings_basis || "").trim()) {
        setErr("Pension earnings basis is required when pension is enabled.");
        return;
      }

      if (pensionEmployeeRate === null || pensionEmployeeRate < 0 || pensionEmployeeRate > 100) {
        setErr("Employee pension rate must be between 0 and 100 when pension is enabled.");
        return;
      }

      if (pensionEmployerRate === null || pensionEmployerRate < 0 || pensionEmployerRate > 100) {
        setErr("Employer pension rate must be between 0 and 100 when pension is enabled.");
        return;
      }
    }

    const payload = {
      contract_number: String(form.contract_number || "").trim() || null,
      job_title: String(form.job_title || "").trim() || null,
      department: String(form.department || "").trim() || null,
      status: "active",
      start_date: startDate,
      leave_date: String(form.leave_date || "").trim() || null,
      pay_frequency: payFrequency,
      pay_basis: payBasis,
      annual_salary: annualSalary !== null ? moneyRound(annualSalary) : null,
      hourly_rate: hourlyRate !== null ? moneyRound(hourlyRate) : null,
      hours_per_week: moneyRound(hours),
      pay_after_leaving: !!form.pay_after_leaving,

      pension_enabled: form.pension_enabled,
      pension_status: form.pension_enabled ? String(form.pension_status || "").trim() || "enrolled" : null,
      pension_scheme_name: form.pension_enabled ? String(form.pension_scheme_name || "").trim() || null : null,
      pension_reference: form.pension_enabled ? String(form.pension_reference || "").trim() || null : null,
      pension_contribution_method: form.pension_enabled
        ? String(form.pension_contribution_method || "").trim() || null
        : null,
      pension_earnings_basis: form.pension_enabled
        ? String(form.pension_earnings_basis || "").trim() || null
        : null,
      pension_employee_rate: form.pension_enabled && pensionEmployeeRate !== null ? pensionEmployeeRate : null,
      pension_employer_rate: form.pension_enabled && pensionEmployerRate !== null ? pensionEmployerRate : null,
      pension_worker_category: form.pension_enabled
        ? String(form.pension_worker_category || "").trim() || null
        : null,
      pension_enrolment_date: form.pension_enabled
        ? String(form.pension_enrolment_date || "").trim() || null
        : null,
      pension_opt_in_date: form.pension_enabled
        ? String(form.pension_opt_in_date || "").trim() || null
        : null,
      pension_opt_out_date: form.pension_enabled
        ? String(form.pension_opt_out_date || "").trim() || null
        : null,
      pension_postponement_date: form.pension_enabled
        ? String(form.pension_postponement_date || "").trim() || null
        : null,
    };

    setSaving(true);

    try {
      const res = await fetch(`/api/employees/${employee.id}/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = isJson(res) ? await res.json().catch(() => ({} as any)) : {};

      if (!res.ok || !data?.ok) {
        setErr(data?.error || data?.message || "Create contract failed.");
        setSaving(false);
        return;
      }

      router.push(`/dashboard/employees/${routeId}`);
      router.refresh();
    } catch {
      setErr("Create contract failed. Network or server error.");
      setSaving(false);
    }
  }

  const payFrequencyOptions = [
    { value: "weekly", label: "Weekly" },
    { value: "fortnightly", label: "Fortnightly" },
    { value: "four_weekly", label: "Four-weekly" },
    { value: "monthly", label: "Monthly" },
  ];

  const payBasisOptions = [
    { value: "salary", label: "Salary" },
    { value: "hourly", label: "Hourly" },
  ];

  const pensionStatusOptions = [
    { value: "not_assessed", label: "Not assessed" },
    { value: "postponed", label: "Postponed" },
    { value: "eligible", label: "Eligible" },
    { value: "enrolled", label: "Enrolled" },
    { value: "opted_in", label: "Opted in" },
    { value: "opted_out", label: "Opted out" },
    { value: "ceased", label: "Ceased" },
    { value: "not_eligible", label: "Not eligible" },
  ];

  const pensionMethodOptions = [
    { value: "relief_at_source", label: "Relief at source" },
    { value: "net_pay", label: "Net pay" },
    { value: "salary_sacrifice", label: "Salary sacrifice" },
  ];

  const pensionBasisOptions = [
    { value: "qualifying_earnings", label: "Qualifying earnings" },
    { value: "pensionable_pay", label: "Pensionable pay" },
    { value: "basic_pay", label: "Basic pay" },
  ];

  const workerCategoryOptions = [
    { value: "eligible_jobholder", label: "Eligible jobholder" },
    { value: "non_eligible_jobholder", label: "Non-eligible jobholder" },
    { value: "entitled_worker", label: "Entitled worker" },
    { value: "postponed", label: "Postponed" },
    { value: "unknown", label: "Unknown" },
  ];

  const BTN_PRIMARY =
    "w-44 inline-flex items-center justify-center rounded-lg bg-[#0f3c85] px-5 py-2 text-white font-semibold disabled:opacity-60 hover:bg-[#0c2f68]";
  const BTN_SECONDARY =
    "w-44 inline-flex items-center justify-center rounded-lg border border-neutral-400 bg-white px-5 py-2 text-neutral-900 font-semibold hover:bg-neutral-50";

  return (
    <PageTemplate currentSection="employees" title="Add contract">
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <ActiveCompanyBannerClient
          loading={companyLoading}
          companyName={company?.name ?? null}
          errorText={companyErr ?? null}
        />

        <div className="mx-auto w-full max-w-none">
          <div className="rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6">
            <h1 className="text-2xl font-semibold text-neutral-900">Add contract</h1>
            <p className="mt-1 text-sm text-neutral-700">
              Add another contract for this existing employee. Use this for second and later contracts.
            </p>

            <div className="mt-4 rounded-lg border border-neutral-300 bg-white p-4">
              <div className="text-sm font-semibold text-neutral-900">
                {employeeLoading ? "Loading employee..." : employeeName}
              </div>
              <div className="mt-1 text-sm text-neutral-700">
                Employee number: {String(employee?.employee_number ?? "").trim() || "—"}
              </div>
              <div className="mt-1 text-sm text-neutral-700">
                Email: {String(employee?.email ?? "").trim() || "—"}
              </div>
            </div>

            {employeeErr ? (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{employeeErr}</div>
            ) : null}

            {err ? (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{err}</div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-6 space-y-6">
              <div className="rounded-lg border border-neutral-300 bg-white p-4">
                <div className="text-sm font-semibold text-neutral-900">Contract</div>

                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-neutral-800">Contract number</label>
                    <input
                      value={form.contract_number}
                      onChange={(e) => setField("contract_number", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                      name="contract_number"
                      placeholder="Leave blank to auto-generate"
                    />
                    <div className="mt-1 text-xs text-neutral-600">
                      Leave blank and the next contract number will be generated automatically.
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-800">Job title</label>
                    <input
                      value={form.job_title}
                      onChange={(e) => setField("job_title", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                      name="job_title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-800">Department</label>
                    <input
                      value={form.department}
                      onChange={(e) => setField("department", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                      name="department"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-800">Contract start date</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setField("start_date", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                      name="start_date"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-800">Leave date</label>
                    <input
                      type="date"
                      value={form.leave_date}
                      onChange={(e) => setField("leave_date", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                      name="leave_date"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-800">Pay frequency</label>
                    <select
                      value={form.pay_frequency}
                      onChange={(e) => setField("pay_frequency", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                      name="pay_frequency"
                    >
                      {payFrequencyOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-800">Pay basis</label>
                    <select
                      value={form.pay_basis}
                      onChange={(e) => {
                        const nextBasis = e.target.value;
                        setField("pay_basis", nextBasis);
                        setPaySource(nextBasis === "hourly" ? "hourly" : "salary");
                      }}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                      name="pay_basis"
                    >
                      {payBasisOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-800">Annual salary (£)</label>
                    <input
                      value={form.annual_salary}
                      onChange={(e) => {
                        setPaySource("salary");
                        setField("annual_salary", e.target.value);
                      }}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                      name="annual_salary"
                      inputMode="decimal"
                      placeholder="30000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-800">Hourly rate (£)</label>
                    <input
                      value={form.hourly_rate}
                      onChange={(e) => {
                        setPaySource("hourly");
                        setField("hourly_rate", e.target.value);
                      }}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                      name="hourly_rate"
                      inputMode="decimal"
                      placeholder="12.50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-800">Hours per week</label>
                    <input
                      value={form.hours_per_week}
                      onChange={(e) => setField("hours_per_week", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                      name="hours_per_week"
                      inputMode="decimal"
                      placeholder="37.5"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="inline-flex items-center gap-3 rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900">
                      <input
                        type="checkbox"
                        checked={form.pay_after_leaving}
                        onChange={(e) => setField("pay_after_leaving", e.target.checked)}
                      />
                      <span>Pay after leaving</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-neutral-300 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-neutral-900">Pension</div>
                    <div className="mt-1 text-xs text-neutral-600">
                      These values will become the pension source of truth for this contract.
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-3 rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900">
                    <input
                      type="checkbox"
                      checked={form.pension_enabled}
                      onChange={(e) => setField("pension_enabled", e.target.checked)}
                    />
                    <span>Pension enabled for this contract</span>
                  </label>
                </div>

                {form.pension_enabled ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <label className="block text-sm text-neutral-800">Pension status</label>
                      <select
                        value={form.pension_status}
                        onChange={(e) => setField("pension_status", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                        name="pension_status"
                      >
                        {pensionStatusOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-800">Scheme name</label>
                      <input
                        value={form.pension_scheme_name}
                        onChange={(e) => setField("pension_scheme_name", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                        name="pension_scheme_name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-800">Pension reference</label>
                      <input
                        value={form.pension_reference}
                        onChange={(e) => setField("pension_reference", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                        name="pension_reference"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-800">Contribution method</label>
                      <select
                        value={form.pension_contribution_method}
                        onChange={(e) => setField("pension_contribution_method", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                        name="pension_contribution_method"
                      >
                        {pensionMethodOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-800">Earnings basis</label>
                      <select
                        value={form.pension_earnings_basis}
                        onChange={(e) => setField("pension_earnings_basis", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                        name="pension_earnings_basis"
                      >
                        {pensionBasisOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-800">Worker category</label>
                      <select
                        value={form.pension_worker_category}
                        onChange={(e) => setField("pension_worker_category", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                        name="pension_worker_category"
                      >
                        {workerCategoryOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-800">Employee rate (%)</label>
                      <input
                        value={form.pension_employee_rate}
                        onChange={(e) => setField("pension_employee_rate", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                        name="pension_employee_rate"
                        inputMode="decimal"
                        placeholder="5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-800">Employer rate (%)</label>
                      <input
                        value={form.pension_employer_rate}
                        onChange={(e) => setField("pension_employer_rate", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                        name="pension_employer_rate"
                        inputMode="decimal"
                        placeholder="3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-800">Enrolment date</label>
                      <input
                        type="date"
                        value={form.pension_enrolment_date}
                        onChange={(e) => setField("pension_enrolment_date", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                        name="pension_enrolment_date"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-800">Opt-in date</label>
                      <input
                        type="date"
                        value={form.pension_opt_in_date}
                        onChange={(e) => setField("pension_opt_in_date", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                        name="pension_opt_in_date"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-800">Opt-out date</label>
                      <input
                        type="date"
                        value={form.pension_opt_out_date}
                        onChange={(e) => setField("pension_opt_out_date", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                        name="pension_opt_out_date"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-800">Postponement date</label>
                      <input
                        type="date"
                        value={form.pension_postponement_date}
                        onChange={(e) => setField("pension_postponement_date", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                        name="pension_postponement_date"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-700">
                    Pension is off for this contract. Turn it on if this contract should participate in pension calculation.
                  </div>
                )}
              </div>

              <div className="pt-1 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving || !!employeeErr || employeeLoading}
                  className={BTN_PRIMARY}
                >
                  {saving ? "Saving..." : "Create contract"}
                </button>

                <button
                  type="button"
                  className={BTN_SECONDARY}
                  onClick={() => router.push(`/dashboard/employees/${routeId}`)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}