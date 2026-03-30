// C:\Projects\wageflow01\app\dashboard\employees\[id]\wizard\pension\page.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageTemplate from "@/components/ui/PageTemplate";

const CARD = "rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6";

type ContributionMethod = "" | "relief_at_source" | "net_pay" | "salary_sacrifice";
type EarningsBasis = "" | "qualifying_earnings" | "pensionable_pay" | "basic_pay";

type PensionRow = {
  pension_status: string;
  pension_scheme_name: string | null;
  pension_reference: string | null;
  pension_contribution_method: ContributionMethod;
  pension_earnings_basis: EarningsBasis;
  pension_employee_rate: number | null;
  pension_employer_rate: number | null;
  pension_enrolment_date: string | null;
  pension_opt_in_date: string | null;
  pension_opt_out_date: string | null;
  pension_postponement_date: string | null;
  pension_worker_category: string | null;
};

type ApiPensionRow = Partial<PensionRow>;

type FieldErrors = {
  pension_status: string;
  pension_contribution_method: string;
  pension_earnings_basis: string;
  pension_employee_rate: string;
  pension_employer_rate: string;
  pension_enrolment_date: string;
  pension_opt_in_date: string;
  pension_opt_out_date: string;
  pension_postponement_date: string;
};

type ToastState = {
  open: boolean;
  message: string;
  tone: "error" | "success" | "info";
};

const PENSION_STATUS_OPTIONS = [
  { value: "not_assessed", label: "Not assessed" },
  { value: "not_eligible", label: "Not eligible" },
  { value: "eligible", label: "Eligible" },
  { value: "enrolled", label: "Enrolled" },
  { value: "opted_in", label: "Opted in" },
  { value: "opted_out", label: "Opted out" },
  { value: "postponed", label: "Postponed" },
];

const CONTRIBUTION_METHOD_OPTIONS: { value: ContributionMethod; label: string }[] = [
  { value: "", label: "Select contribution method" },
  { value: "relief_at_source", label: "Relief at source" },
  { value: "net_pay", label: "Net pay" },
  { value: "salary_sacrifice", label: "Salary sacrifice" },
];

const EARNINGS_BASIS_OPTIONS: { value: EarningsBasis; label: string }[] = [
  { value: "", label: "Select earnings basis" },
  { value: "qualifying_earnings", label: "Qualifying earnings" },
  { value: "pensionable_pay", label: "Pensionable pay" },
  { value: "basic_pay", label: "Basic pay" },
];

const WORKER_CATEGORY_OPTIONS = [
  { value: "", label: "Select worker category" },
  { value: "eligible_jobholder", label: "Eligible jobholder" },
  { value: "non_eligible_jobholder", label: "Non-eligible jobholder" },
  { value: "entitled_worker", label: "Entitled worker" },
  { value: "postponed", label: "Postponed" },
  { value: "unknown", label: "Unknown" },
];

function isJson(res: Response) {
  return (res.headers.get("content-type") || "").includes("application/json");
}

function isIsoDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeContributionMethod(value: unknown): ContributionMethod {
  const s = String(value || "").trim().toLowerCase();
  if (s === "relief_at_source") return "relief_at_source";
  if (s === "net_pay") return "net_pay";
  if (s === "salary_sacrifice") return "salary_sacrifice";
  return "";
}

function normalizeEarningsBasis(value: unknown): EarningsBasis {
  const s = String(value || "").trim().toLowerCase();
  if (s === "qualifying_earnings") return "qualifying_earnings";
  if (s === "pensionable_pay") return "pensionable_pay";
  if (s === "basic_pay") return "basic_pay";
  return "";
}

function getFieldErrors(form: PensionRow): FieldErrors {
  const status = String(form.pension_status || "").trim();
  const contributionMethod = String(form.pension_contribution_method || "").trim();
  const earningsBasis = String(form.pension_earnings_basis || "").trim();

  const employeeRate = toNumberOrNull(form.pension_employee_rate);
  const employerRate = toNumberOrNull(form.pension_employer_rate);

  const enrolmentDate = String(form.pension_enrolment_date || "").trim();
  const optInDate = String(form.pension_opt_in_date || "").trim();
  const optOutDate = String(form.pension_opt_out_date || "").trim();
  const postponementDate = String(form.pension_postponement_date || "").trim();

  const requiresSchemeDetails = status === "enrolled" || status === "opted_in";

  return {
    pension_status: status ? "" : "Select a pension status.",
    pension_contribution_method:
      requiresSchemeDetails && !contributionMethod ? "Select a contribution method." : "",
    pension_earnings_basis:
      requiresSchemeDetails && !earningsBasis ? "Select an earnings basis." : "",
    pension_employee_rate:
      employeeRate !== null && (employeeRate < 0 || employeeRate > 100)
        ? "Employee rate must be between 0 and 100."
        : "",
    pension_employer_rate:
      employerRate !== null && (employerRate < 0 || employerRate > 100)
        ? "Employer rate must be between 0 and 100."
        : "",
    pension_enrolment_date:
      requiresSchemeDetails && !enrolmentDate
        ? "Enrolment date is required for an enrolled or opted-in worker."
        : enrolmentDate && !isIsoDateOnly(enrolmentDate)
          ? "Enrolment date must be valid."
          : "",
    pension_opt_in_date:
      status === "opted_in" && !optInDate
        ? "Opt-in date is required when the worker has opted in."
        : optInDate && !isIsoDateOnly(optInDate)
          ? "Opt-in date must be valid."
          : "",
    pension_opt_out_date:
      status === "opted_out" && !optOutDate
        ? "Opt-out date is required when the worker has opted out."
        : optOutDate && !isIsoDateOnly(optOutDate)
          ? "Opt-out date must be valid."
          : "",
    pension_postponement_date:
      status === "postponed" && !postponementDate
        ? "Postponement date is required when the worker is postponed."
        : postponementDate && !isIsoDateOnly(postponementDate)
          ? "Postponement date must be valid."
          : "",
  };
}

export default function PensionPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => String(params?.id || ""), [params]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    tone: "info",
  });

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<PensionRow>({
    pension_status: "not_assessed",
    pension_scheme_name: "",
    pension_reference: "",
    pension_contribution_method: "",
    pension_earnings_basis: "",
    pension_employee_rate: null,
    pension_employer_rate: null,
    pension_enrolment_date: "",
    pension_opt_in_date: "",
    pension_opt_out_date: "",
    pension_postponement_date: "",
    pension_worker_category: "",
  });

  const [touched, setTouched] = useState({
    pension_status: false,
    pension_contribution_method: false,
    pension_earnings_basis: false,
    pension_employee_rate: false,
    pension_employer_rate: false,
    pension_enrolment_date: false,
    pension_opt_in_date: false,
    pension_opt_out_date: false,
    pension_postponement_date: false,
  });

  function showToast(message: string, tone: ToastState["tone"] = "info") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

    setToast({
      open: true,
      message,
      tone,
    });

    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }));
    }, 4500);
  }

  const backHref = `/dashboard/employees/${id}/wizard/tax`;

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const r = await fetch(`/api/employees/${id}/pension`, { cache: "no-store" });

        if (r.status === 204 || r.status === 404) {
          return;
        }

        if (!r.ok) {
          throw new Error(`load ${r.status}`);
        }

        if (isJson(r)) {
          const j = await r.json().catch(() => null);
          const d = (j?.data ?? j ?? null) as ApiPensionRow | null;

          if (alive && d) {
            setForm({
              pension_status: String(d.pension_status || "not_assessed").trim() || "not_assessed",
              pension_scheme_name: d.pension_scheme_name ?? "",
              pension_reference: d.pension_reference ?? "",
              pension_contribution_method: normalizeContributionMethod(
                d.pension_contribution_method
              ),
              pension_earnings_basis: normalizeEarningsBasis(d.pension_earnings_basis),
              pension_employee_rate:
                typeof d.pension_employee_rate === "number"
                  ? d.pension_employee_rate
                  : toNumberOrNull(d.pension_employee_rate),
              pension_employer_rate:
                typeof d.pension_employer_rate === "number"
                  ? d.pension_employer_rate
                  : toNumberOrNull(d.pension_employer_rate),
              pension_enrolment_date: d.pension_enrolment_date ?? "",
              pension_opt_in_date: d.pension_opt_in_date ?? "",
              pension_opt_out_date: d.pension_opt_out_date ?? "",
              pension_postponement_date: d.pension_postponement_date ?? "",
              pension_worker_category: d.pension_worker_category ?? "",
            });
          }
        }
      } catch (e: unknown) {
        if (alive) {
          setErr(String((e as { message?: string })?.message || e));
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [id]);

  function onTextChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        name === "pension_employee_rate" || name === "pension_employer_rate"
          ? value === ""
            ? null
            : Number(value)
          : name === "pension_reference"
            ? value.toUpperCase()
            : value,
    }));
  }

  function onBlur(
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name } = e.target;

    if (
      name === "pension_status" ||
      name === "pension_contribution_method" ||
      name === "pension_earnings_basis" ||
      name === "pension_employee_rate" ||
      name === "pension_employer_rate" ||
      name === "pension_enrolment_date" ||
      name === "pension_opt_in_date" ||
      name === "pension_opt_out_date" ||
      name === "pension_postponement_date"
    ) {
      setTouched((prev) => ({ ...prev, [name]: true }));
    }
  }

  const fieldErrors = useMemo(() => getFieldErrors(form), [form]);

  const canSave = useMemo(() => {
    return (
      !fieldErrors.pension_status &&
      !fieldErrors.pension_contribution_method &&
      !fieldErrors.pension_earnings_basis &&
      !fieldErrors.pension_employee_rate &&
      !fieldErrors.pension_employer_rate &&
      !fieldErrors.pension_enrolment_date &&
      !fieldErrors.pension_opt_in_date &&
      !fieldErrors.pension_opt_out_date &&
      !fieldErrors.pension_postponement_date
    );
  }, [fieldErrors]);

  async function onSave() {
    setTouched({
      pension_status: true,
      pension_contribution_method: true,
      pension_earnings_basis: true,
      pension_employee_rate: true,
      pension_employer_rate: true,
      pension_enrolment_date: true,
      pension_opt_in_date: true,
      pension_opt_out_date: true,
      pension_postponement_date: true,
    });

    if (!canSave) {
      const msg = [
        fieldErrors.pension_status,
        fieldErrors.pension_contribution_method,
        fieldErrors.pension_earnings_basis,
        fieldErrors.pension_employee_rate,
        fieldErrors.pension_employer_rate,
        fieldErrors.pension_enrolment_date,
        fieldErrors.pension_opt_in_date,
        fieldErrors.pension_opt_out_date,
        fieldErrors.pension_postponement_date,
      ]
        .filter(Boolean)
        .join(" ");

      showToast(msg, "error");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const payload = {
        pension_status: String(form.pension_status || "").trim() || "not_assessed",
        pension_scheme_name: String(form.pension_scheme_name || "").trim() || null,
        pension_reference: String(form.pension_reference || "").trim().toUpperCase() || null,
        pension_contribution_method: form.pension_contribution_method || null,
        pension_earnings_basis: form.pension_earnings_basis || null,
        pension_employee_rate: toNumberOrNull(form.pension_employee_rate),
        pension_employer_rate: toNumberOrNull(form.pension_employer_rate),
        pension_enrolment_date: String(form.pension_enrolment_date || "").trim() || null,
        pension_opt_in_date: String(form.pension_opt_in_date || "").trim() || null,
        pension_opt_out_date: String(form.pension_opt_out_date || "").trim() || null,
        pension_postponement_date: String(form.pension_postponement_date || "").trim() || null,
        pension_worker_category: String(form.pension_worker_category || "").trim() || null,
      };

      const res = await fetch(`/api/employees/${id}/pension`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = isJson(res) ? await res.json().catch(() => ({})) : {};
        const msg = j?.error || j?.detail || `save ${res.status}`;
        throw new Error(msg);
      }

      if (isJson(res)) {
        await res.json().catch(() => null);
      }

      showToast("Pension details saved.", "success");
      router.push(`/dashboard/employees/${id}/wizard/bank`);
    } catch (e: unknown) {
      const msg = String((e as { message?: string })?.message || e);
      setErr(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  const toastStyles =
    toast.tone === "error"
      ? "bg-red-600 text-white"
      : toast.tone === "success"
        ? "bg-emerald-600 text-white"
        : "bg-neutral-900 text-white";

  const inputClass = (hasError: boolean) =>
    `mt-1 w-full rounded-md border bg-white p-2 outline-none ${
      hasError ? "border-red-600 ring-2 ring-red-200" : "border-neutral-400"
    }`;

  const status = String(form.pension_status || "").trim();
  const showSchemeFields = status === "enrolled" || status === "opted_in";

  return (
    <PageTemplate
      title="Pension Details"
      currentSection="employees"
      headerMode="wizard"
      backHref={backHref}
      backLabel="Back"
    >
      {toast.open && (
        <div className="fixed top-4 left-1/2 z-50 w-[min(720px,92vw)] -translate-x-1/2">
          <div className={`rounded-xl px-4 py-3 shadow-lg ring-1 ring-black/10 ${toastStyles}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-medium">{toast.message}</div>
              <button
                type="button"
                onClick={() => setToast((prev) => ({ ...prev, open: false }))}
                className="text-xs opacity-90 hover:opacity-100"
                aria-label="Close toast"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={CARD}>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {err ? (
              <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">{err}</div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="pension_status" className="block text-sm font-medium text-neutral-900">
                  Pension status
                </label>
                <select
                  id="pension_status"
                  name="pension_status"
                  value={form.pension_status}
                  onChange={onTextChange}
                  onBlur={onBlur}
                  className={inputClass(!!(touched.pension_status && fieldErrors.pension_status))}
                  aria-invalid={touched.pension_status && !!fieldErrors.pension_status}
                >
                  {PENSION_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {touched.pension_status && fieldErrors.pension_status ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.pension_status}</div>
                ) : (
                  <div className="mt-1 text-xs text-neutral-700">
                    Start with not assessed if pension assessment has not been completed yet.
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="pension_worker_category"
                  className="block text-sm font-medium text-neutral-900"
                >
                  Worker category
                </label>
                <select
                  id="pension_worker_category"
                  name="pension_worker_category"
                  value={form.pension_worker_category || ""}
                  onChange={onTextChange}
                  onBlur={onBlur}
                  className={inputClass(false)}
                >
                  {WORKER_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value || "blank"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-xs text-neutral-700">
                  Set the worker category when auto-enrolment assessment has been reviewed.
                </div>
              </div>

              <div>
                <label
                  htmlFor="pension_scheme_name"
                  className="block text-sm font-medium text-neutral-900"
                >
                  Scheme name
                </label>
                <input
                  id="pension_scheme_name"
                  name="pension_scheme_name"
                  value={form.pension_scheme_name || ""}
                  onChange={onTextChange}
                  onBlur={onBlur}
                  className={inputClass(false)}
                  placeholder="e.g. NEST"
                />
              </div>

              <div>
                <label
                  htmlFor="pension_reference"
                  className="block text-sm font-medium text-neutral-900"
                >
                  Pension reference
                </label>
                <input
                  id="pension_reference"
                  name="pension_reference"
                  value={form.pension_reference || ""}
                  onChange={onTextChange}
                  onBlur={onBlur}
                  className={inputClass(false)}
                  placeholder="Scheme reference"
                />
              </div>

              <div>
                <label
                  htmlFor="pension_contribution_method"
                  className="block text-sm font-medium text-neutral-900"
                >
                  Contribution method
                </label>
                <select
                  id="pension_contribution_method"
                  name="pension_contribution_method"
                  value={form.pension_contribution_method}
                  onChange={onTextChange}
                  onBlur={onBlur}
                  className={inputClass(
                    !!(
                      touched.pension_contribution_method &&
                      fieldErrors.pension_contribution_method
                    )
                  )}
                  aria-invalid={
                    touched.pension_contribution_method &&
                    !!fieldErrors.pension_contribution_method
                  }
                >
                  {CONTRIBUTION_METHOD_OPTIONS.map((opt) => (
                    <option key={opt.value || "blank"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {touched.pension_contribution_method &&
                fieldErrors.pension_contribution_method ? (
                  <div className="mt-1 text-xs text-red-700">
                    {fieldErrors.pension_contribution_method}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-neutral-700">
                    Required once the employee is enrolled or has opted in.
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="pension_earnings_basis"
                  className="block text-sm font-medium text-neutral-900"
                >
                  Earnings basis
                </label>
                <select
                  id="pension_earnings_basis"
                  name="pension_earnings_basis"
                  value={form.pension_earnings_basis}
                  onChange={onTextChange}
                  onBlur={onBlur}
                  className={inputClass(
                    !!(touched.pension_earnings_basis && fieldErrors.pension_earnings_basis)
                  )}
                  aria-invalid={
                    touched.pension_earnings_basis && !!fieldErrors.pension_earnings_basis
                  }
                >
                  {EARNINGS_BASIS_OPTIONS.map((opt) => (
                    <option key={opt.value || "blank"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {touched.pension_earnings_basis && fieldErrors.pension_earnings_basis ? (
                  <div className="mt-1 text-xs text-red-700">
                    {fieldErrors.pension_earnings_basis}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-neutral-700">
                    Required once the employee is enrolled or has opted in.
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="pension_employee_rate"
                  className="block text-sm font-medium text-neutral-900"
                >
                  Employee rate (%)
                </label>
                <input
                  id="pension_employee_rate"
                  name="pension_employee_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.pension_employee_rate ?? ""}
                  onChange={onTextChange}
                  onBlur={onBlur}
                  className={inputClass(
                    !!(touched.pension_employee_rate && fieldErrors.pension_employee_rate)
                  )}
                  aria-invalid={
                    touched.pension_employee_rate && !!fieldErrors.pension_employee_rate
                  }
                />
                {touched.pension_employee_rate && fieldErrors.pension_employee_rate ? (
                  <div className="mt-1 text-xs text-red-700">
                    {fieldErrors.pension_employee_rate}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-neutral-700">
                    Enter a percentage, for example 5.
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="pension_employer_rate"
                  className="block text-sm font-medium text-neutral-900"
                >
                  Employer rate (%)
                </label>
                <input
                  id="pension_employer_rate"
                  name="pension_employer_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.pension_employer_rate ?? ""}
                  onChange={onTextChange}
                  onBlur={onBlur}
                  className={inputClass(
                    !!(touched.pension_employer_rate && fieldErrors.pension_employer_rate)
                  )}
                  aria-invalid={
                    touched.pension_employer_rate && !!fieldErrors.pension_employer_rate
                  }
                />
                {touched.pension_employer_rate && fieldErrors.pension_employer_rate ? (
                  <div className="mt-1 text-xs text-red-700">
                    {fieldErrors.pension_employer_rate}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-neutral-700">
                    Enter a percentage, for example 3.
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="pension_enrolment_date"
                  className="block text-sm font-medium text-neutral-900"
                >
                  Enrolment date
                </label>
                <input
                  id="pension_enrolment_date"
                  name="pension_enrolment_date"
                  type="date"
                  value={form.pension_enrolment_date || ""}
                  onChange={onTextChange}
                  onBlur={onBlur}
                  className={inputClass(
                    !!(touched.pension_enrolment_date && fieldErrors.pension_enrolment_date)
                  )}
                  aria-invalid={
                    touched.pension_enrolment_date && !!fieldErrors.pension_enrolment_date
                  }
                />
                {touched.pension_enrolment_date && fieldErrors.pension_enrolment_date ? (
                  <div className="mt-1 text-xs text-red-700">
                    {fieldErrors.pension_enrolment_date}
                  </div>
                ) : showSchemeFields ? (
                  <div className="mt-1 text-xs text-neutral-700">
                    Required for enrolled or opted-in workers.
                  </div>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="pension_opt_in_date"
                  className="block text-sm font-medium text-neutral-900"
                >
                  Opt-in date
                </label>
                <input
                  id="pension_opt_in_date"
                  name="pension_opt_in_date"
                  type="date"
                  value={form.pension_opt_in_date || ""}
                  onChange={onTextChange}
                  onBlur={onBlur}
                  className={inputClass(
                    !!(touched.pension_opt_in_date && fieldErrors.pension_opt_in_date)
                  )}
                  aria-invalid={
                    touched.pension_opt_in_date && !!fieldErrors.pension_opt_in_date
                  }
                />
                {touched.pension_opt_in_date && fieldErrors.pension_opt_in_date ? (
                  <div className="mt-1 text-xs text-red-700">
                    {fieldErrors.pension_opt_in_date}
                  </div>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="pension_opt_out_date"
                  className="block text-sm font-medium text-neutral-900"
                >
                  Opt-out date
                </label>
                <input
                  id="pension_opt_out_date"
                  name="pension_opt_out_date"
                  type="date"
                  value={form.pension_opt_out_date || ""}
                  onChange={onTextChange}
                  onBlur={onBlur}
                  className={inputClass(
                    !!(touched.pension_opt_out_date && fieldErrors.pension_opt_out_date)
                  )}
                  aria-invalid={
                    touched.pension_opt_out_date && !!fieldErrors.pension_opt_out_date
                  }
                />
                {touched.pension_opt_out_date && fieldErrors.pension_opt_out_date ? (
                  <div className="mt-1 text-xs text-red-700">
                    {fieldErrors.pension_opt_out_date}
                  </div>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="pension_postponement_date"
                  className="block text-sm font-medium text-neutral-900"
                >
                  Postponement date
                </label>
                <input
                  id="pension_postponement_date"
                  name="pension_postponement_date"
                  type="date"
                  value={form.pension_postponement_date || ""}
                  onChange={onTextChange}
                  onBlur={onBlur}
                  className={inputClass(
                    !!(
                      touched.pension_postponement_date &&
                      fieldErrors.pension_postponement_date
                    )
                  )}
                  aria-invalid={
                    touched.pension_postponement_date &&
                    !!fieldErrors.pension_postponement_date
                  }
                />
                {touched.pension_postponement_date &&
                fieldErrors.pension_postponement_date ? (
                  <div className="mt-1 text-xs text-red-700">
                    {fieldErrors.pension_postponement_date}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Link href={backHref} className="rounded-md bg-neutral-400 px-4 py-2 text-white">
                Back
              </Link>
              <button
                type="button"
                onClick={onSave}
                disabled={saving || !canSave}
                className="rounded-md bg-blue-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save and continue"}
              </button>
            </div>
          </>
        )}
      </div>
    </PageTemplate>
  );
}