// C:\Projects\wageflow01\app\dashboard\employees\[id]\wizard\p45\page.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageTemplate from "@/components/ui/PageTemplate";
import { formatUkDate } from "@/lib/formatUkDate";

type TaxCodeBasis = "cumulative" | "week1_month1";
type P45Row = {
  employer_paye_ref: string | null;
  employer_name: string | null;
  works_number: string | null;
  leaving_date: string | null;
  tax_code: string | null;
  tax_code_basis: TaxCodeBasis | null;
  total_pay_to_date: number | null;
  total_tax_to_date: number | null;
  had_student_loan_deductions: boolean | null;
};

type ApiP45Row = Partial<P45Row> & {
  tax_basis?: string | null;
};

type FieldErrors = {
  employer_paye_ref: string;
  employer_name: string;
  leaving_date: string;
  tax_code: string;
  tax_code_basis: string;
  total_pay_to_date: string;
  total_tax_to_date: string;
};

type ToastState = {
  kind: "error" | "success" | "info";
  message: string;
};

function isJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json");
}

function isIsoDateOnly(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

function normalizePayeRef(input: string) {
  const raw = String(input || "").trim().toUpperCase();
  return raw.replace(/\s+/g, "");
}

function isValidPayeRef(input: string) {
  const s = normalizePayeRef(input);
  return /^\d{3}\/[A-Z0-9]{1,10}$/.test(s);
}

function normalizeTaxCode(input: string) {
  return String(input || "").trim().toUpperCase();
}

function normalizeTaxCodeBasis(input: string | null | undefined): TaxCodeBasis | null {
  const s = String(input || "").trim().toLowerCase();
  if (!s) return null;
  if (s === "cumulative") return "cumulative";
  if (
    s === "week1_month1" ||
    s === "week1month1" ||
    s === "w1m1" ||
    s === "wk1/mth1" ||
    s === "wk1mth1" ||
    s === "week1" ||
    s === "month1" ||
    s === "week 1 / month 1" ||
    s === "week 1 month 1"
  ) {
    return "week1_month1";
  }
  return null;
}

function addMonths(dateOnlyIso: string, months: number) {
  if (!isIsoDateOnly(dateOnlyIso)) return null;
  const dt = new Date(dateOnlyIso + "T00:00:00.000Z");
  if (Number.isNaN(dt.getTime())) return null;
  const out = new Date(dt);
  out.setUTCMonth(out.getUTCMonth() + months);
  return out;
}

function readStartDateFromJson(j: any): string | null {
  const candidates = [
    j?.employee?.start_date,
    j?.employee?.startDate,
    j?.employee?.employment_start_date,
    j?.employee?.employmentStartDate,
    j?.data?.start_date,
    j?.data?.startDate,
    j?.data?.employment_start_date,
    j?.data?.employmentStartDate,
    j?.start_date,
    j?.startDate,
    j?.employment_start_date,
    j?.employmentStartDate,
  ].filter(Boolean);

  const s = candidates.length ? String(candidates[0]).trim() : "";
  return isIsoDateOnly(s) ? s : null;
}

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getFieldErrors(form: P45Row): FieldErrors {
  const payeRef = normalizePayeRef(form.employer_paye_ref || "");
  const employerName = String(form.employer_name || "").trim();
  const leavingDate = String(form.leaving_date || "").trim();
  const taxCode = normalizeTaxCode(form.tax_code || "");
  const taxCodeBasis = String(form.tax_code_basis || "").trim();
  const totalPay = toNumberOrNull(form.total_pay_to_date);
  const totalTax = toNumberOrNull(form.total_tax_to_date);

  return {
    employer_paye_ref: !payeRef
      ? "Employer PAYE reference is required."
      : !isValidPayeRef(payeRef)
        ? 'Employer PAYE reference must look like "123/AB12345".'
        : "",
    employer_name: employerName ? "" : "Employer name is required.",
    leaving_date: !leavingDate
      ? "Leaving date is required."
      : !isIsoDateOnly(leavingDate)
        ? "Leaving date must be valid."
        : "",
    tax_code: taxCode ? "" : "Tax code is required.",
    tax_code_basis:
      taxCodeBasis === "cumulative" || taxCodeBasis === "week1_month1"
        ? ""
        : "Tax basis is required.",
    total_pay_to_date:
      totalPay === null
        ? "Total pay to date is required."
        : totalPay < 0
          ? "Total pay to date cannot be negative."
          : "",
    total_tax_to_date:
      totalTax === null
        ? "Total tax to date is required."
        : totalTax < 0
          ? "Total tax to date cannot be negative."
          : "",
  };
}

export default function P45Page() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => String(params?.id || ""), [params]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [employeeStartDate, setEmployeeStartDate] = useState<string | null>(null);
  const [taxRuleForced, setTaxRuleForced] = useState(false);

  const [form, setForm] = useState<P45Row>({
    employer_paye_ref: "",
    employer_name: "",
    works_number: "",
    leaving_date: "",
    tax_code: "1257L",
    tax_code_basis: "cumulative",
    total_pay_to_date: null,
    total_tax_to_date: null,
    had_student_loan_deductions: false,
  });

  const [touched, setTouched] = useState({
    employer_paye_ref: false,
    employer_name: false,
    leaving_date: false,
    tax_code: false,
    tax_code_basis: false,
    total_pay_to_date: false,
    total_tax_to_date: false,
  });

  function showToast(kind: ToastState["kind"], message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ kind, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 5500);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        try {
          const r1 = await fetch(`/api/employees/${id}/details`, { cache: "no-store" });
          if (r1.ok && isJson(r1)) {
            const j1 = await r1.json().catch(() => null);
            const sd = readStartDateFromJson(j1);
            if (alive && sd) setEmployeeStartDate(sd);
          } else {
            const r2 = await fetch(`/api/employees/${id}`, { cache: "no-store" });
            if (r2.ok && isJson(r2)) {
              const j2 = await r2.json().catch(() => null);
              const sd = readStartDateFromJson(j2);
              if (alive && sd) setEmployeeStartDate(sd);
            }
          }
        } catch {
          // ignore
        }

        const r = await fetch(`/api/employees/${id}/p45`, { cache: "no-store" });

        if (r.status === 204 || r.status === 404) return;
        if (!r.ok) throw new Error(`load ${r.status}`);

        if (isJson(r)) {
          const j = await r.json().catch(() => null);
          const d = (j?.data ?? j ?? null) as ApiP45Row | null;

          if (alive && d) {
            const incomingBasis = normalizeTaxCodeBasis(
              (d.tax_code_basis as string | null | undefined) ?? d.tax_basis
            );

            setForm({
              employer_paye_ref: d.employer_paye_ref ?? "",
              employer_name: d.employer_name ?? "",
              works_number: d.works_number ?? "",
              leaving_date: d.leaving_date ?? "",
              tax_code: d.tax_code ?? "1257L",
              tax_code_basis: incomingBasis ?? "cumulative",
              total_pay_to_date:
                typeof d.total_pay_to_date === "number" ? d.total_pay_to_date : null,
              total_tax_to_date:
                typeof d.total_tax_to_date === "number" ? d.total_tax_to_date : null,
              had_student_loan_deductions:
                typeof d.had_student_loan_deductions === "boolean"
                  ? d.had_student_loan_deductions
                  : false,
            });
          }
        }
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? Boolean(checked)
          : name === "total_pay_to_date" || name === "total_tax_to_date"
            ? value === ""
              ? null
              : Number(value)
            : name === "employer_paye_ref"
              ? normalizePayeRef(value)
              : name === "tax_code"
                ? normalizeTaxCode(value)
                : name === "tax_code_basis"
                  ? normalizeTaxCodeBasis(value)
                  : value,
    }));
  }

  function onBlur(name: keyof typeof touched) {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  useEffect(() => {
    const leave = String(form.leaving_date || "").trim();
    const start = String(employeeStartDate || "").trim();

    if (!isIsoDateOnly(leave) || !isIsoDateOnly(start)) {
      setTaxRuleForced(false);
      return;
    }

    const leavePlus3 = addMonths(leave, 3);
    if (!leavePlus3) {
      setTaxRuleForced(false);
      return;
    }

    const startDt = new Date(start + "T00:00:00.000Z");
    if (Number.isNaN(startDt.getTime())) {
      setTaxRuleForced(false);
      return;
    }

    const isMoreThan3Months = startDt.getTime() > leavePlus3.getTime();

    if (isMoreThan3Months) {
      setTaxRuleForced(true);
      setForm((prev) => ({
        ...prev,
        tax_code: "1257L",
        tax_code_basis: "week1_month1",
      }));

      showToast(
        "info",
        "Leaving date is more than 3 months before the employee start date. HMRC rule: use tax code 1257L on Week 1 / Month 1 until a P6 notice arrives."
      );
    } else {
      setTaxRuleForced(false);
    }
  }, [form.leaving_date, employeeStartDate]);

  async function tryUpdateEmployeeTaxCode() {
    const payload = { tax_code: "1257L", tax_code_basis: "week1_month1" };

    try {
      const r1 = await fetch(`/api/employees/${id}/tax`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r1.ok) return true;
    } catch {}

    try {
      const r2 = await fetch(`/api/employees/${id}/details`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r2.ok) return true;
    } catch {}

    try {
      const r3 = await fetch(`/api/employees/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r3.ok) return true;
    } catch {}

    return false;
  }

  const fieldErrors = useMemo(() => getFieldErrors(form), [form]);

  const canSave = useMemo(() => {
    return (
      !fieldErrors.employer_paye_ref &&
      !fieldErrors.employer_name &&
      !fieldErrors.leaving_date &&
      !fieldErrors.tax_code &&
      !fieldErrors.tax_code_basis &&
      !fieldErrors.total_pay_to_date &&
      !fieldErrors.total_tax_to_date
    );
  }, [fieldErrors]);

  async function onSave() {
    setTouched({
      employer_paye_ref: true,
      employer_name: true,
      leaving_date: true,
      tax_code: true,
      tax_code_basis: true,
      total_pay_to_date: true,
      total_tax_to_date: true,
    });

    if (!canSave) {
      const message = [
        fieldErrors.employer_paye_ref,
        fieldErrors.employer_name,
        fieldErrors.leaving_date,
        fieldErrors.tax_code,
        fieldErrors.tax_code_basis,
        fieldErrors.total_pay_to_date,
        fieldErrors.total_tax_to_date,
      ]
        .filter(Boolean)
        .join(" ");
      showToast("error", message);
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const payload: P45Row = {
        employer_paye_ref: normalizePayeRef(String(form.employer_paye_ref || "")) || null,
        employer_name: String(form.employer_name || "").trim() || null,
        works_number: String(form.works_number || "").trim() || null,
        leaving_date: String(form.leaving_date || "").trim() || null,
        tax_code: normalizeTaxCode(String(form.tax_code || "")) || null,
        tax_code_basis: form.tax_code_basis || null,
        total_pay_to_date:
          typeof form.total_pay_to_date === "number" ? form.total_pay_to_date : null,
        total_tax_to_date:
          typeof form.total_tax_to_date === "number" ? form.total_tax_to_date : null,
        had_student_loan_deductions:
          typeof form.had_student_loan_deductions === "boolean"
            ? form.had_student_loan_deductions
            : null,
      };

      if (taxRuleForced) {
        payload.tax_code = "1257L";
        payload.tax_code_basis = "week1_month1";
      }

      const res = await fetch(`/api/employees/${id}/p45`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (isJson(res)) {
        await res.json().catch(() => null);
      }

      if (!res.ok) {
        throw new Error(`save ${res.status}`);
      }

      if (taxRuleForced) {
        const ok = await tryUpdateEmployeeTaxCode();
        if (!ok) {
          showToast(
            "error",
            "Tax rule applied, but WageFlow could not update the employee tax code record automatically. Fix the employee tax code to 1257L Week 1 / Month 1 before continuing."
          );
          setSaving(false);
          return;
        }
      }

      showToast("success", "P45 details saved.");
      router.push(`/dashboard/employees/${id}/wizard/bank`);
    } catch (e: any) {
      const msg = String(e?.message || e);
      setErr(msg);
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  }

  const inputBase =
    "mt-1 w-full rounded-md border bg-white p-2 outline-none focus:ring-2 focus:ring-offset-1";
  const okBorder = "border-neutral-400 focus:ring-blue-200";
  const badBorder = "border-red-500 focus:ring-red-200";

  function inputClass(hasError: boolean) {
    return `${inputBase} ${hasError ? badBorder : okBorder}`;
  }

  return (
    <PageTemplate
      title="P45 Details"
      currentSection="employees"
      headerMode="wizard"
      backHref={`/dashboard/employees/${id}/wizard/starter`}
      backLabel="Back"
    >
      {toast ? (
        <div className="fixed right-4 top-4 z-50 w-[min(520px,90vw)]">
          <div
            className={
              "rounded-xl px-4 py-3 shadow-lg ring-1 " +
              (toast.kind === "success"
                ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                : toast.kind === "info"
                  ? "bg-blue-50 text-blue-900 ring-blue-200"
                  : "bg-red-50 text-red-900 ring-red-200")
            }
            role="status"
            aria-live="polite"
          >
            <div className="text-sm font-semibold">
              {toast.kind === "success"
                ? "Saved"
                : toast.kind === "info"
                  ? "HMRC rule"
                  : "Action needed"}
            </div>
            <div className="mt-1 text-sm">{toast.message}</div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl bg-neutral-300 p-6 shadow-sm ring-1 ring-neutral-400">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {err ? (
              <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
                {err}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-neutral-900">
                  Employer PAYE reference
                </label>
                <input
                  name="employer_paye_ref"
                  value={form.employer_paye_ref || ""}
                  onChange={onChange}
                  onBlur={() => onBlur("employer_paye_ref")}
                  className={inputClass(
                    !!(touched.employer_paye_ref && fieldErrors.employer_paye_ref)
                  )}
                  placeholder="123/AB12345"
                  aria-invalid={
                    touched.employer_paye_ref && !!fieldErrors.employer_paye_ref
                  }
                />
                {touched.employer_paye_ref && fieldErrors.employer_paye_ref ? (
                  <div className="mt-1 text-xs text-red-700">
                    {fieldErrors.employer_paye_ref}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-neutral-700">
                    Format: 123/AB12345
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-neutral-900">Employer name</label>
                <input
                  name="employer_name"
                  value={form.employer_name || ""}
                  onChange={onChange}
                  onBlur={() => onBlur("employer_name")}
                  className={inputClass(
                    !!(touched.employer_name && fieldErrors.employer_name)
                  )}
                  aria-invalid={touched.employer_name && !!fieldErrors.employer_name}
                />
                {touched.employer_name && fieldErrors.employer_name ? (
                  <div className="mt-1 text-xs text-red-700">
                    {fieldErrors.employer_name}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-neutral-900">
                  Works or payroll number
                </label>
                <input
                  name="works_number"
                  value={form.works_number || ""}
                  onChange={onChange}
                  className={inputClass(false)}
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-900">Leaving date</label>
                <input
                  type="date"
                  name="leaving_date"
                  value={form.leaving_date || ""}
                  onChange={onChange}
                  onBlur={() => onBlur("leaving_date")}
                  className={inputClass(
                    !!(touched.leaving_date && fieldErrors.leaving_date)
                  )}
                  aria-invalid={touched.leaving_date && !!fieldErrors.leaving_date}
                />
                {touched.leaving_date && fieldErrors.leaving_date ? (
                  <div className="mt-1 text-xs text-red-700">
                    {fieldErrors.leaving_date}
                  </div>
                ) : employeeStartDate ? (
                  <div className="mt-1 text-xs text-neutral-700">
                    Employee start date: {formatUkDate(employeeStartDate, "—")}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-neutral-700">
                    Employee start date: not available. 3-month tax rule cannot be checked reliably.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-neutral-900">Tax code</label>
                <input
                  name="tax_code"
                  value={form.tax_code || ""}
                  onChange={onChange}
                  onBlur={() => onBlur("tax_code")}
                  disabled={taxRuleForced}
                  className={
                    inputClass(!!(touched.tax_code && fieldErrors.tax_code)) +
                    (taxRuleForced ? " cursor-not-allowed opacity-80" : "")
                  }
                  aria-invalid={touched.tax_code && !!fieldErrors.tax_code}
                />
                {touched.tax_code && fieldErrors.tax_code ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.tax_code}</div>
                ) : taxRuleForced ? (
                  <div className="mt-1 text-xs text-blue-900">Forced by rule: 1257L.</div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-neutral-900">Tax basis</label>
                <select
                  name="tax_code_basis"
                  value={form.tax_code_basis || ""}
                  onChange={onChange}
                  onBlur={() => onBlur("tax_code_basis")}
                  disabled={taxRuleForced}
                  className={
                    inputClass(!!(touched.tax_code_basis && fieldErrors.tax_code_basis)) +
                    (taxRuleForced ? " cursor-not-allowed opacity-80" : "")
                  }
                  aria-invalid={touched.tax_code_basis && !!fieldErrors.tax_code_basis}
                >
                  <option value="cumulative">Cumulative</option>
                  <option value="week1_month1">Week 1 / Month 1</option>
                </select>
                {touched.tax_code_basis && fieldErrors.tax_code_basis ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.tax_code_basis}</div>
                ) : taxRuleForced ? (
                  <div className="mt-1 text-xs text-blue-900">
                    Forced by rule: Week 1 / Month 1.
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-neutral-900">Total pay to date</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="total_pay_to_date"
                  value={form.total_pay_to_date ?? ""}
                  onChange={onChange}
                  onBlur={() => onBlur("total_pay_to_date")}
                  className={inputClass(
                    !!(touched.total_pay_to_date && fieldErrors.total_pay_to_date)
                  )}
                  aria-invalid={
                    touched.total_pay_to_date && !!fieldErrors.total_pay_to_date
                  }
                />
                {touched.total_pay_to_date && fieldErrors.total_pay_to_date ? (
                  <div className="mt-1 text-xs text-red-700">
                    {fieldErrors.total_pay_to_date}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-neutral-900">Total tax to date</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="total_tax_to_date"
                  value={form.total_tax_to_date ?? ""}
                  onChange={onChange}
                  onBlur={() => onBlur("total_tax_to_date")}
                  className={inputClass(
                    !!(touched.total_tax_to_date && fieldErrors.total_tax_to_date)
                  )}
                  aria-invalid={
                    touched.total_tax_to_date && !!fieldErrors.total_tax_to_date
                  }
                />
                {touched.total_tax_to_date && fieldErrors.total_tax_to_date ? (
                  <div className="mt-1 text-xs text-red-700">
                    {fieldErrors.total_tax_to_date}
                  </div>
                ) : null}
              </div>

              <label className="mt-2 flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  name="had_student_loan_deductions"
                  checked={!!form.had_student_loan_deductions}
                  onChange={onChange}
                />
                <span className="text-sm text-neutral-900">
                  Student loan deductions were being made
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Link
                href={`/dashboard/employees/${id}/wizard/starter`}
                className="rounded-md bg-neutral-400 px-4 py-2 text-white"
              >
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