"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageTemplate from "@/components/layout/PageTemplate";
import { formatMoney } from "@/lib/formatMoney";
import ActiveCompanyBannerClient from "@/components/ui/ActiveCompanyBannerClient";
import { createClient } from "@/lib/supabase/client";

type ActiveCompany = { id?: string; name?: string } | null;

type EmployeeRow = {
  id?: string | null;
  employee_id?: string | null;
  employee_number?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

type ContractRow = {
  id?: string | null;
  employee_id?: string | null;
  contract_number?: string | null;
  job_title?: string | null;
  department?: string | null;
  status?: string | null;
  start_date?: string | null;
  leave_date?: string | null;
  pay_frequency?: string | null;
  pay_basis?: string | null;
  annual_salary?: any | null;
  hourly_rate?: any | null;
  hours_per_week?: any | null;
  pay_after_leaving?: boolean | null;
  created_at?: string | null;

  pension_enabled?: boolean | null;
  pension_status?: string | null;
  pension_scheme_name?: string | null;
  pension_reference?: string | null;
  pension_contribution_method?: string | null;
  pension_earnings_basis?: string | null;
  pension_employee_rate?: any | null;
  pension_employer_rate?: any | null;
  pension_worker_category?: string | null;
  pension_enrolment_date?: string | null;
  pension_opt_in_date?: string | null;
  pension_opt_out_date?: string | null;
  pension_postponement_date?: string | null;
};

type FormState = {
  contract_number: string;
  job_title: string;
  department: string;
  status: string;
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
};

const WEEKS_PER_YEAR = 52.14285714;

const CARD = "rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6";
const BTN_PRIMARY =
  "w-44 inline-flex items-center justify-center rounded-lg bg-[#0f3c85] px-5 py-2 text-white font-semibold disabled:opacity-60 hover:bg-[#0c2f68]";
const BTN_SECONDARY =
  "w-32 inline-flex items-center justify-center rounded-lg border border-neutral-400 bg-white px-4 py-2 text-neutral-800 hover:bg-neutral-100 disabled:opacity-60";

type PaySource = "salary" | "hourly" | null;

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    String(s || "").trim()
  );
}

function strOrBlank(v: any) {
  return String(v ?? "").trim();
}

function toNumberOrNull(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function roundTo(n: number, dp: number) {
  const p = Math.pow(10, dp);
  return Math.round((n + Number.EPSILON) * p) / p;
}

function moneyRound(n: number) {
  return roundTo(n, 2);
}

function rateRound(n: number) {
  return roundTo(n, 6);
}

function percentageRound(n: number) {
  return roundTo(n, 4);
}

function computeEquivalentHourlyRate(annualSalary: number, hoursPerWeek: number) {
  if (!Number.isFinite(annualSalary) || !Number.isFinite(hoursPerWeek)) return null;
  if (annualSalary <= 0 || hoursPerWeek <= 0) return null;
  return annualSalary / (WEEKS_PER_YEAR * hoursPerWeek);
}

function computeAnnualSalary(hourlyRate: number, hoursPerWeek: number) {
  if (!Number.isFinite(hourlyRate) || !Number.isFinite(hoursPerWeek)) return null;
  if (hourlyRate <= 0 || hoursPerWeek <= 0) return null;
  return hourlyRate * hoursPerWeek * WEEKS_PER_YEAR;
}

function formatNumberString(n: number, dp = 2) {
  return roundTo(n, dp).toFixed(dp).replace(/\.?0+$/, "");
}

function sanitizeContractNumber(v: string) {
  return String(v || "")
    .trim()
    .replace(/[^A-Za-z0-9-]/g, "");
}

function isIsoDateOnly(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || "").trim());
}

function getContractSuffixNumber(contractNumber: string | null | undefined): number | null {
  const raw = String(contractNumber || "").trim();
  if (!raw) return null;
  const match = raw.match(/-(\d+)$/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function toSortableTime(value: string | null | undefined): number {
  const raw = String(value || "").trim();
  if (!raw) return Number.MAX_SAFE_INTEGER;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
}

function sortContractsMainFirst(rows: ContractRow[]) {
  return [...rows].sort((a, b) => {
    const aSuffix = getContractSuffixNumber(a.contract_number);
    const bSuffix = getContractSuffixNumber(b.contract_number);

    if (aSuffix !== null && bSuffix !== null && aSuffix !== bSuffix) {
      return aSuffix - bSuffix;
    }

    if (aSuffix !== null && bSuffix === null) return -1;
    if (aSuffix === null && bSuffix !== null) return 1;

    const aStart = toSortableTime(a.start_date);
    const bStart = toSortableTime(b.start_date);
    if (aStart !== bStart) return aStart - bStart;

    const aCreated = toSortableTime(a.created_at);
    const bCreated = toSortableTime(b.created_at);
    if (aCreated !== bCreated) return aCreated - bCreated;

    return String(a.contract_number || "").localeCompare(String(b.contract_number || ""));
  });
}

export default function EditContractPage() {
  const params = useParams<{ id: string; contractId: string }>();
  const routeEmployeeId = useMemo(() => String(params?.id || "").trim(), [params]);
  const routeContractId = useMemo(() => String(params?.contractId || "").trim(), [params]);
  const router = useRouter();

  const [company, setCompany] = useState<ActiveCompany>(null);
  const [companyErr, setCompanyErr] = useState<string | null>(null);
  const companyLoading = !company && !companyErr;

  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [contract, setContract] = useState<ContractRow | null>(null);
  const [isPrimaryContract, setIsPrimaryContract] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [paySource, setPaySource] = useState<PaySource>(null);

  const [form, setForm] = useState<FormState>({
    contract_number: "",
    job_title: "",
    department: "",
    status: "active",
    start_date: "",
    leave_date: "",
    pay_frequency: "monthly",
    pay_basis: "salary",
    annual_salary: "",
    hourly_rate: "",
    hours_per_week: "",
    pay_after_leaving: false,

    pension_enabled: false,
    pension_status: "not_assessed",
    pension_scheme_name: "",
    pension_reference: "",
    pension_contribution_method: "",
    pension_earnings_basis: "",
    pension_employee_rate: "",
    pension_employer_rate: "",
    pension_worker_category: "",
    pension_enrolment_date: "",
    pension_opt_in_date: "",
    pension_opt_out_date: "",
    pension_postponement_date: "",
  });

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    let ignore = false;

    async function loadActiveCompany() {
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

        if (data?.ok && data?.company?.id) {
          setCompany({ id: String(data.company.id), name: data.company.name ?? null });
          return;
        }

        if (data?.id) {
          setCompany({ id: String(data.id), name: data.name ?? null });
          return;
        }

        setCompany(null);
        setCompanyErr(data?.error || "No active company selected.");
      } catch {
        if (ignore) return;
        setCompany(null);
        setCompanyErr("Could not load active company.");
      }
    }

    loadActiveCompany();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const hours = toNumberOrNull(form.hours_per_week);
    if (!hours || hours <= 0) return;

    const salary = toNumberOrNull(form.annual_salary);
    const hourly = toNumberOrNull(form.hourly_rate);

    if (paySource === "salary" || form.pay_basis === "salary") {
      if (salary !== null && salary > 0) {
        const derivedHourly = computeEquivalentHourlyRate(salary, hours);
        if (derivedHourly !== null) {
          const next = formatNumberString(derivedHourly, 6);
          if (strOrBlank(form.hourly_rate) !== next) {
            setForm((prev) => ({ ...prev, hourly_rate: next }));
          }
        }
      }
      return;
    }

    if (paySource === "hourly" || form.pay_basis === "hourly") {
      if (hourly !== null && hourly > 0) {
        const derivedSalary = computeAnnualSalary(hourly, hours);
        if (derivedSalary !== null) {
          const next = formatNumberString(derivedSalary, 2);
          if (strOrBlank(form.annual_salary) !== next) {
            setForm((prev) => ({ ...prev, annual_salary: next }));
          }
        }
      }
    }
  }, [form.annual_salary, form.hourly_rate, form.hours_per_week, form.pay_basis, paySource]);

  useEffect(() => {
    let alive = true;

    async function loadData() {
      if (!routeEmployeeId || !routeContractId) {
        setErr("Missing employee or contract id.");
        setLoading(false);
        return;
      }

      if (companyLoading) return;

      const companyId = company?.id ? String(company.id) : "";
      if (companyErr || !companyId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErr(null);

        const supabase = createClient();

        async function fetchEmployeeBy(
          col: "id" | "employee_id" | "employee_number",
          value: string
        ) {
          return await supabase
            .from("employees")
            .select("id, employee_id, employee_number, first_name, last_name, email")
            .eq("company_id", companyId)
            .eq(col, value)
            .maybeSingle<EmployeeRow>();
        }

        let employeeRow: EmployeeRow | null = null;

        if (isUuid(routeEmployeeId)) {
          const r1 = await fetchEmployeeBy("id", routeEmployeeId);
          if (!alive) return;
          employeeRow = (r1.data as any) ?? null;

          if (!employeeRow) {
            const r2 = await fetchEmployeeBy("employee_id", routeEmployeeId);
            if (!alive) return;
            employeeRow = (r2.data as any) ?? null;
          }
        } else {
          const r1 = await fetchEmployeeBy("employee_id", routeEmployeeId);
          if (!alive) return;
          employeeRow = (r1.data as any) ?? null;

          if (!employeeRow) {
            const r2 = await fetchEmployeeBy("employee_number", routeEmployeeId);
            if (!alive) return;
            employeeRow = (r2.data as any) ?? null;
          }
        }

        if (!employeeRow?.id) {
          setEmployee(null);
          setContract(null);
          setErr("Employee not found for the active company.");
          setLoading(false);
          return;
        }

        setEmployee(employeeRow);

        const { data: contractRow, error: contractErr } = await supabase
          .from("employee_contracts")
          .select(
            [
              "id",
              "employee_id",
              "contract_number",
              "job_title",
              "department",
              "status",
              "start_date",
              "leave_date",
              "pay_frequency",
              "pay_basis",
              "annual_salary",
              "hourly_rate",
              "hours_per_week",
              "pay_after_leaving",
              "created_at",
              "pension_enabled",
              "pension_status",
              "pension_scheme_name",
              "pension_reference",
              "pension_contribution_method",
              "pension_earnings_basis",
              "pension_employee_rate",
              "pension_employer_rate",
              "pension_worker_category",
              "pension_enrolment_date",
              "pension_opt_in_date",
              "pension_opt_out_date",
              "pension_postponement_date",
            ].join(",")
          )
          .eq("company_id", companyId)
          .eq("employee_id", String(employeeRow.id))
          .eq("id", routeContractId)
          .maybeSingle<ContractRow>();

        if (!alive) return;

        if (contractErr || !contractRow?.id) {
          setContract(null);
          setErr("Contract not found for this employee.");
          setLoading(false);
          return;
        }

        setContract(contractRow);

        const { data: allContracts } = await supabase
          .from("employee_contracts")
          .select("id, contract_number, start_date, created_at")
          .eq("company_id", companyId)
          .eq("employee_id", String(employeeRow.id));

        if (!alive) return;

        const sortedContracts = sortContractsMainFirst(
          (Array.isArray(allContracts) ? allContracts : []) as ContractRow[]
        );
        const primaryId = String(sortedContracts[0]?.id || "").trim();
        setIsPrimaryContract(primaryId === String(contractRow.id));

        setForm({
          contract_number: strOrBlank(contractRow.contract_number),
          job_title: strOrBlank(contractRow.job_title),
          department: strOrBlank(contractRow.department),
          status: strOrBlank(contractRow.status) || "active",
          start_date: strOrBlank(contractRow.start_date),
          leave_date: strOrBlank(contractRow.leave_date),
          pay_frequency: strOrBlank(contractRow.pay_frequency) || "monthly",
          pay_basis: strOrBlank(contractRow.pay_basis) || "salary",
          annual_salary:
            contractRow.annual_salary !== null && contractRow.annual_salary !== undefined
              ? String(contractRow.annual_salary)
              : "",
          hourly_rate:
            contractRow.hourly_rate !== null && contractRow.hourly_rate !== undefined
              ? String(contractRow.hourly_rate)
              : "",
          hours_per_week:
            contractRow.hours_per_week !== null && contractRow.hours_per_week !== undefined
              ? String(contractRow.hours_per_week)
              : "",
          pay_after_leaving: contractRow.pay_after_leaving === true,

          pension_enabled: contractRow.pension_enabled === true,
          pension_status: strOrBlank(contractRow.pension_status) || "not_assessed",
          pension_scheme_name: strOrBlank(contractRow.pension_scheme_name),
          pension_reference: strOrBlank(contractRow.pension_reference),
          pension_contribution_method: strOrBlank(contractRow.pension_contribution_method),
          pension_earnings_basis: strOrBlank(contractRow.pension_earnings_basis),
          pension_employee_rate:
            contractRow.pension_employee_rate !== null &&
            contractRow.pension_employee_rate !== undefined
              ? String(contractRow.pension_employee_rate)
              : "",
          pension_employer_rate:
            contractRow.pension_employer_rate !== null &&
            contractRow.pension_employer_rate !== undefined
              ? String(contractRow.pension_employer_rate)
              : "",
          pension_worker_category: strOrBlank(contractRow.pension_worker_category),
          pension_enrolment_date: strOrBlank(contractRow.pension_enrolment_date),
          pension_opt_in_date: strOrBlank(contractRow.pension_opt_in_date),
          pension_opt_out_date: strOrBlank(contractRow.pension_opt_out_date),
          pension_postponement_date: strOrBlank(contractRow.pension_postponement_date),
        });

        setPaySource(
          strOrBlank(contractRow.pay_basis).toLowerCase() === "hourly" ? "hourly" : "salary"
        );
      } catch (e: any) {
        if (!alive) return;
        setErr(String(e?.message || e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    loadData();

    return () => {
      alive = false;
    };
  }, [routeEmployeeId, routeContractId, company?.id, companyErr, companyLoading]);

  const employeeName = useMemo(() => {
    const f = String(employee?.first_name || "").trim();
    const l = String(employee?.last_name || "").trim();
    const full = `${f} ${l}`.trim();
    return full || "Employee";
  }, [employee?.first_name, employee?.last_name]);

  async function onSave() {
    setErr(null);

    const companyId = company?.id ? String(company.id) : "";
    if (companyErr || !companyId) {
      setErr("No active company selected. Go back and select your company first.");
      return;
    }

    if (!routeEmployeeId || !routeContractId) {
      setErr("Missing employee or contract id.");
      return;
    }

    if (!employee?.id || !contract?.id) {
      setErr("Employee or contract is not loaded yet.");
      return;
    }

    const contractNumber = sanitizeContractNumber(form.contract_number);
    const jobTitle = strOrBlank(form.job_title);
    const department = strOrBlank(form.department) || null;
    const status = strOrBlank(form.status).toLowerCase();
    const startDate = strOrBlank(form.start_date);
    const leaveDate = strOrBlank(form.leave_date) || null;
    const payFrequency = strOrBlank(form.pay_frequency).toLowerCase();
    const payBasis = strOrBlank(form.pay_basis).toLowerCase();
    const annualSalary = toNumberOrNull(form.annual_salary);
    const hourlyRate = toNumberOrNull(form.hourly_rate);
    const hoursPerWeek = toNumberOrNull(form.hours_per_week);

    if (!contractNumber) {
      setErr("Contract number is required.");
      return;
    }

    if (contractNumber !== strOrBlank(form.contract_number)) {
      setErr("Contract number may only contain letters, numbers, and hyphens.");
      return;
    }

    if (!jobTitle) {
      setErr("Job title is required.");
      return;
    }

    if (!startDate || !isIsoDateOnly(startDate)) {
      setErr("Contract start date is required and must be YYYY-MM-DD.");
      return;
    }

    if (leaveDate && !isIsoDateOnly(leaveDate)) {
      setErr("Leave date must be YYYY-MM-DD when provided.");
      return;
    }

    if (leaveDate && leaveDate < startDate) {
      setErr("Leave date cannot be earlier than start date.");
      return;
    }

    if (!["active", "inactive", "leaver"].includes(status)) {
      setErr("Status must be Active, Inactive, or Leaver.");
      return;
    }

    if (!["weekly", "fortnightly", "four_weekly", "monthly"].includes(payFrequency)) {
      setErr("Pay frequency must be weekly, fortnightly, four-weekly, or monthly.");
      return;
    }

    if (!["salary", "hourly"].includes(payBasis)) {
      setErr("Pay basis must be salary or hourly.");
      return;
    }

    if (hoursPerWeek === null || hoursPerWeek <= 0) {
      setErr("Hours per week must be greater than 0.");
      return;
    }

    if (payBasis === "salary" && (annualSalary === null || annualSalary <= 0)) {
      setErr("Annual salary must be greater than 0 for a salary contract.");
      return;
    }

    if (payBasis === "hourly" && (hourlyRate === null || hourlyRate <= 0)) {
      setErr("Hourly rate must be greater than 0 for an hourly contract.");
      return;
    }

    const pensionEnabled = form.pension_enabled;
    const pensionStatus = strOrBlank(form.pension_status).toLowerCase();
    const pensionSchemeName = strOrBlank(form.pension_scheme_name) || null;
    const pensionReference = strOrBlank(form.pension_reference).toUpperCase() || null;
    const pensionContributionMethod =
      strOrBlank(form.pension_contribution_method).toLowerCase() || null;
    const pensionEarningsBasis =
      strOrBlank(form.pension_earnings_basis).toLowerCase() || null;
    const pensionEmployeeRate = toNumberOrNull(form.pension_employee_rate);
    const pensionEmployerRate = toNumberOrNull(form.pension_employer_rate);
    const pensionWorkerCategory =
      strOrBlank(form.pension_worker_category).toLowerCase() || null;
    const pensionEnrolmentDate = strOrBlank(form.pension_enrolment_date) || null;
    const pensionOptInDate = strOrBlank(form.pension_opt_in_date) || null;
    const pensionOptOutDate = strOrBlank(form.pension_opt_out_date) || null;
    const pensionPostponementDate = strOrBlank(form.pension_postponement_date) || null;

    if (pensionEnrolmentDate && !isIsoDateOnly(pensionEnrolmentDate)) {
      setErr("Pension enrolment date must be YYYY-MM-DD when provided.");
      return;
    }

    if (pensionOptInDate && !isIsoDateOnly(pensionOptInDate)) {
      setErr("Pension opt-in date must be YYYY-MM-DD when provided.");
      return;
    }

    if (pensionOptOutDate && !isIsoDateOnly(pensionOptOutDate)) {
      setErr("Pension opt-out date must be YYYY-MM-DD when provided.");
      return;
    }

    if (pensionPostponementDate && !isIsoDateOnly(pensionPostponementDate)) {
      setErr("Pension postponement date must be YYYY-MM-DD when provided.");
      return;
    }

    if (pensionEnabled) {
      if (
        ![
          "not_assessed",
          "not_eligible",
          "eligible",
          "enrolled",
          "opted_in",
          "opted_out",
          "postponed",
          "ceased",
        ].includes(pensionStatus)
      ) {
        setErr("Pension status is invalid.");
        return;
      }

      if (!pensionSchemeName) {
        setErr("Pension scheme name is required when pension is enabled.");
        return;
      }

      if (
        !["relief_at_source", "net_pay", "salary_sacrifice"].includes(
          String(pensionContributionMethod || "")
        )
      ) {
        setErr("Pension contribution method is required when pension is enabled.");
        return;
      }

      if (
        !["qualifying_earnings", "pensionable_pay", "basic_pay"].includes(
          String(pensionEarningsBasis || "")
        )
      ) {
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

    try {
      setSaving(true);

      const supabase = createClient();

      const { data: dupCheck, error: dupErr } = await supabase
        .from("employee_contracts")
        .select("id")
        .eq("company_id", companyId)
        .eq("contract_number", contractNumber)
        .neq("id", String(contract.id))
        .maybeSingle();

      if (dupErr) {
        setErr(String(dupErr.message || dupErr));
        setSaving(false);
        return;
      }

      if (dupCheck?.id) {
        setErr("That contract number already exists.");
        setSaving(false);
        return;
      }

      const updatePayload = {
        contract_number: contractNumber,
        job_title: jobTitle,
        department,
        status,
        start_date: startDate,
        leave_date: leaveDate,
        pay_frequency: payFrequency,
        pay_basis: payBasis,
        annual_salary: annualSalary !== null ? moneyRound(annualSalary) : null,
        hourly_rate: hourlyRate !== null ? rateRound(hourlyRate) : null,
        hours_per_week: hoursPerWeek !== null ? moneyRound(hoursPerWeek) : null,
        pay_after_leaving: !!form.pay_after_leaving,

        pension_enabled: pensionEnabled,
        pension_status: pensionEnabled ? pensionStatus : "not_assessed",
        pension_scheme_name: pensionEnabled ? pensionSchemeName : null,
        pension_reference: pensionEnabled ? pensionReference : null,
        pension_contribution_method: pensionEnabled ? pensionContributionMethod : null,
        pension_earnings_basis: pensionEnabled ? pensionEarningsBasis : null,
        pension_employee_rate:
          pensionEnabled && pensionEmployeeRate !== null
            ? percentageRound(pensionEmployeeRate)
            : null,
        pension_employer_rate:
          pensionEnabled && pensionEmployerRate !== null
            ? percentageRound(pensionEmployerRate)
            : null,
        pension_worker_category: pensionEnabled ? pensionWorkerCategory : null,
        pension_enrolment_date: pensionEnabled ? pensionEnrolmentDate : null,
        pension_opt_in_date: pensionEnabled ? pensionOptInDate : null,
        pension_opt_out_date: pensionEnabled ? pensionOptOutDate : null,
        pension_postponement_date: pensionEnabled ? pensionPostponementDate : null,
      };

      const { error: updateErr } = await supabase
        .from("employee_contracts")
        .update(updatePayload)
        .eq("company_id", companyId)
        .eq("employee_id", String(employee.id))
        .eq("id", String(contract.id));

      if (updateErr) {
        setErr(String(updateErr.message || updateErr));
        setSaving(false);
        return;
      }

      if (isPrimaryContract) {
        const legacyPensionPayload = {
          pension_status: pensionEnabled ? pensionStatus : "not_assessed",
          pension_scheme_name: pensionEnabled ? pensionSchemeName : null,
          pension_reference: pensionEnabled ? pensionReference : null,
          pension_contribution_method: pensionEnabled ? pensionContributionMethod : null,
          pension_earnings_basis: pensionEnabled ? pensionEarningsBasis : null,
          pension_employee_rate:
            pensionEnabled && pensionEmployeeRate !== null
              ? percentageRound(pensionEmployeeRate)
              : null,
          pension_employer_rate:
            pensionEnabled && pensionEmployerRate !== null
              ? percentageRound(pensionEmployerRate)
              : null,
          pension_worker_category: pensionEnabled ? pensionWorkerCategory : null,
          pension_enrolment_date: pensionEnabled ? pensionEnrolmentDate : null,
          pension_opt_in_date: pensionEnabled ? pensionOptInDate : null,
          pension_opt_out_date: pensionEnabled ? pensionOptOutDate : null,
          pension_postponement_date: pensionEnabled ? pensionPostponementDate : null,
        };

        const { error: employeeMirrorErr } = await supabase
          .from("employees")
          .update(legacyPensionPayload)
          .eq("id", String(employee.id));

        if (employeeMirrorErr) {
          setErr(
            `Contract saved, but employee pension mirror failed. ${String(
              employeeMirrorErr.message || employeeMirrorErr
            )}`
          );
          setSaving(false);
          return;
        }
      }

      router.push(`/dashboard/employees/${routeEmployeeId}`);
      router.refresh();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageTemplate title="Edit contract" currentSection="employees">
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <ActiveCompanyBannerClient
          loading={companyLoading}
          companyName={company?.name ?? null}
          errorText={companyErr}
        />

        <div className="rounded-2xl bg-white/80 px-4 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-lg sm:text-xl text-[#0f3c85] truncate">
                <span className="font-bold">Edit contract</span>
                <span className="text-neutral-700"> · {employeeName}</span>
              </div>

              <div className="mt-1 text-sm text-neutral-700">
                {strOrBlank(employee?.employee_number) ? (
                  <>
                    <span className="font-semibold text-neutral-900">
                      Emp {strOrBlank(employee?.employee_number)}
                    </span>
                    <span className="text-neutral-500"> · </span>
                  </>
                ) : null}
                {strOrBlank(contract?.contract_number) || "Contract"}
                {isPrimaryContract ? (
                  <span className="text-neutral-500"> · Primary contract</span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/dashboard/employees/${routeEmployeeId}`} className={BTN_SECONDARY}>
                Back
              </Link>
              <button
                type="button"
                onClick={onSave}
                disabled={saving || loading}
                className={BTN_PRIMARY}
              >
                {saving ? "Saving..." : "Save contract"}
              </button>
            </div>
          </div>
        </div>

        <div className={CARD}>
          {loading ? (
            <div className="text-sm text-neutral-900">Loading...</div>
          ) : err ? (
            <div className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">{err}</div>
          ) : (
            <>
              <div className="text-xl font-semibold text-neutral-900">Contract details</div>
              <div className="mt-1 text-sm text-neutral-700">
                Edit this contract’s pay and pension settings separately from the employee master record.
              </div>

              {isPrimaryContract ? (
                <div className="mt-4 rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
                  This is the primary contract. Saving pension here also updates the employee-level
                  pension record for backward compatibility.
                </div>
              ) : null}

              <div className="mt-6 rounded-lg border border-neutral-300 bg-white p-4">
                <div className="text-sm font-semibold text-neutral-900">Contract</div>

                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-neutral-800">Contract number</label>
                    <input
                      value={form.contract_number}
                      onChange={(e) => setField("contract_number", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                      name="contract_number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-800">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setField("status", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                      name="status"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="leaver">Leaver</option>
                    </select>
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
                    <label className="block text-sm text-neutral-800">Start date</label>
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
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="four_weekly">Four-weekly</option>
                      <option value="monthly">Monthly</option>
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
                      <option value="salary">Salary</option>
                      <option value="hourly">Hourly</option>
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

              <div className="mt-6 rounded-lg border border-neutral-300 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-neutral-900">Contract pension</div>
                    <div className="mt-1 text-xs text-neutral-600">
                      These values belong to this contract only.
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
                        <option value="not_assessed">Not assessed</option>
                        <option value="not_eligible">Not eligible</option>
                        <option value="eligible">Eligible</option>
                        <option value="enrolled">Enrolled</option>
                        <option value="opted_in">Opted in</option>
                        <option value="opted_out">Opted out</option>
                        <option value="postponed">Postponed</option>
                        <option value="ceased">Ceased</option>
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
                        onChange={(e) => setField("pension_reference", e.target.value.toUpperCase())}
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
                        <option value="">Select contribution method</option>
                        <option value="relief_at_source">Relief at source</option>
                        <option value="net_pay">Net pay</option>
                        <option value="salary_sacrifice">Salary sacrifice</option>
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
                        <option value="">Select earnings basis</option>
                        <option value="qualifying_earnings">Qualifying earnings</option>
                        <option value="pensionable_pay">Pensionable pay</option>
                        <option value="basic_pay">Basic pay</option>
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
                        <option value="">Select worker category</option>
                        <option value="eligible_jobholder">Eligible jobholder</option>
                        <option value="non_eligible_jobholder">Non-eligible jobholder</option>
                        <option value="entitled_worker">Entitled worker</option>
                        <option value="postponed">Postponed</option>
                        <option value="unknown">Unknown</option>
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
                    Pension is off for this contract.
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3 justify-end">
                <Link href={`/dashboard/employees/${routeEmployeeId}`} className={BTN_SECONDARY}>
                  Cancel
                </Link>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving || loading}
                  className={BTN_PRIMARY}
                >
                  {saving ? "Saving..." : "Save contract"}
                </button>
              </div>

              <div className="mt-4 text-xs text-neutral-600">
                Salary reference: {formatMoney(form.annual_salary || null)}. Hourly reference:{" "}
                {strOrBlank(form.hourly_rate) ? `£${strOrBlank(form.hourly_rate)}` : "—"}.
              </div>
            </>
          )}
        </div>
      </div>
    </PageTemplate>
  );
}