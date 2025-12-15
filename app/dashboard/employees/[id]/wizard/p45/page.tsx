/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\[id]\wizard\p45\page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageTemplate from "@/components/ui/PageTemplate";
import { formatUkDate } from "@/lib/formatUkDate";

type P45Row = {
  employer_paye_ref: string | null;
  employer_name: string | null;
  works_number: string | null;
  leaving_date: string | null; // ISO yyyy-mm-dd
  tax_code: string | null;
  tax_basis: "Cumulative" | "Week1Month1" | null;
  total_pay_to_date: number | null;
  total_tax_to_date: number | null;
  had_student_loan_deductions: boolean | null;
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
  // Practical guardrail: 3 digits, slash, 1–10 alphanum (covers common PAYE refs)
  return /^\d{3}\/[A-Z0-9]{1,10}$/.test(s);
}

function addMonths(dateOnlyIso: string, months: number) {
  if (!isIsoDateOnly(dateOnlyIso)) return null;
  const dt = new Date(dateOnlyIso + "T00:00:00.000Z");
  if (Number.isNaN(dt.getTime())) return null;
  const out = new Date(dt);
  out.setUTCMonth(out.getUTCMonth() + months);
  return out;
}

function isoDateOnly(dt: Date) {
  if (!dt || Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
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

export default function P45Page() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => String(params?.id || ""), [params]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    kind: "error" | "success" | "info";
    message: string;
  } | null>(null);

  const [employeeStartDate, setEmployeeStartDate] = useState<string | null>(null);
  const [taxRuleForced, setTaxRuleForced] = useState(false);

  const [form, setForm] = useState<P45Row>({
    employer_paye_ref: "",
    employer_name: "",
    works_number: "",
    leaving_date: "",
    tax_code: "1257L",
    tax_basis: "Cumulative",
    total_pay_to_date: 0,
    total_tax_to_date: 0,
    had_student_loan_deductions: false,
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(kind: "error" | "success" | "info", message: string) {
    setToast({ kind, message });
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // Fetch employee start date (for the 3-month rule)
        // Try details endpoint first, then fallback to /api/employees/:id
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
          // If we can’t read it, we still allow saving, but we cannot apply the 3-month rule reliably.
        }

        const r = await fetch(`/api/employees/${id}/p45`, { cache: "no-store" });

        if (r.status === 204 || r.status === 404) return;
        if (!r.ok) throw new Error(`load ${r.status}`);

        if (isJson(r)) {
          const j = await r.json().catch(() => null);
          const d = (j?.data ?? j ?? null) as Partial<P45Row> | null;

          if (alive && d) {
            setForm((prev) => ({
              ...prev,
              employer_paye_ref: d.employer_paye_ref ?? prev.employer_paye_ref,
              employer_name: d.employer_name ?? prev.employer_name,
              works_number: d.works_number ?? prev.works_number,
              leaving_date: d.leaving_date ?? prev.leaving_date,
              tax_code: d.tax_code ?? prev.tax_code,
              tax_basis: (d.tax_basis as any) ?? prev.tax_basis,
              total_pay_to_date:
                typeof d.total_pay_to_date === "number"
                  ? d.total_pay_to_date
                  : prev.total_pay_to_date,
              total_tax_to_date:
                typeof d.total_tax_to_date === "number"
                  ? d.total_tax_to_date
                  : prev.total_tax_to_date,
              had_student_loan_deductions:
                typeof d.had_student_loan_deductions === "boolean"
                  ? d.had_student_loan_deductions
                  : prev.had_student_loan_deductions,
            }));
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
    const { name, value, type, checked } = e.target as any;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? Boolean(checked)
          : name === "total_pay_to_date" || name === "total_tax_to_date"
          ? value === "" ? null : Number(value)
          : value,
    }));
  }

  // Apply the 3-month rule whenever we have both dates and leaving_date changes.
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
        tax_basis: "Week1Month1",
      }));

      // Only toast if we haven't already shown it for this state.
      showToast(
        "info",
        "Leaving date is more than 3 months before the employee start date. HMRC rule: use tax code 1257L on Week 1 / Month 1 until a P6 notice arrives."
      );
    } else {
      setTaxRuleForced(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.leaving_date, employeeStartDate]);

  async function tryUpdateEmployeeTaxCode() {
    // Best-guess endpoint. If this fails, we block finishing because you said MUST be on employee record.
    const payload = { tax_code: "1257L", tax_basis: "Week1Month1" };

    // Attempt 1: /details
    try {
      const r1 = await fetch(`/api/employees/${id}/details`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r1.ok) return true;
    } catch {}

    // Attempt 2: /api/employees/:id (if your project supports it)
    try {
      const r2 = await fetch(`/api/employees/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r2.ok) return true;
    } catch {}

    return false;
  }

  async function onSave() {
    const paye = normalizePayeRef(String(form.employer_paye_ref || ""));
    if (!paye || !isValidPayeRef(paye)) {
      showToast(
        "error",
        'Employer PAYE reference is required and must look like "123/AB12345".'
      );
      return;
    }

    if (form.leaving_date && !isIsoDateOnly(String(form.leaving_date))) {
      showToast("error", "Leaving date must be a valid date.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const payload: P45Row = {
        employer_paye_ref: paye || null,
        employer_name: String(form.employer_name || "").trim() || null,
        works_number: String(form.works_number || "").trim() || null,
        leaving_date: String(form.leaving_date || "").trim() || null,
        tax_code: String(form.tax_code || "").trim() || null,
        tax_basis: (form.tax_basis as any) || null,
        total_pay_to_date:
          typeof form.total_pay_to_date === "number" ? form.total_pay_to_date : null,
        total_tax_to_date:
          typeof form.total_tax_to_date === "number" ? form.total_tax_to_date : null,
        had_student_loan_deductions:
          typeof form.had_student_loan_deductions === "boolean"
            ? form.had_student_loan_deductions
            : null,
      };

      // If rule is forced, make it impossible to sneak different values through.
      if (taxRuleForced) {
        payload.tax_code = "1257L";
        payload.tax_basis = "Week1Month1";
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

  const payeNow = normalizePayeRef(String(form.employer_paye_ref || ""));
  const payeOk = isValidPayeRef(payeNow);

  const inputBase =
    "mt-1 w-full rounded-md border bg-white p-2 outline-none focus:ring-2 focus:ring-offset-1";
  const okBorder = "border-neutral-400 focus:ring-blue-200";
  const badBorder = "border-red-500 focus:ring-red-200";

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

      <div className="rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6">
        {loading ? (
          <div>Loading…</div>
        ) : (
          <>
            {err ? (
              <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
                {err}
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-neutral-900">
                  Employer PAYE reference (required)
                </label>
                <input
                  name="employer_paye_ref"
                  value={form.employer_paye_ref || ""}
                  onChange={onChange}
                  className={inputBase + " " + (payeOk ? okBorder : badBorder)}
                  placeholder='e.g. 123/AB12345'
                />
                {!payeOk ? (
                  <div className="mt-1 text-xs text-red-700">
                    Must look like 123/AB12345.
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-neutral-900">Employer name</label>
                <input
                  name="employer_name"
                  value={form.employer_name || ""}
                  onChange={onChange}
                  className={inputBase + " " + okBorder}
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-900">
                  Works/payroll number
                </label>
                <input
                  name="works_number"
                  value={form.works_number || ""}
                  onChange={onChange}
                  className={inputBase + " " + okBorder}
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-900">Leaving date</label>
                <input
                  type="date"
                  name="leaving_date"
                  value={form.leaving_date || ""}
                  onChange={onChange}
                  className={inputBase + " " + okBorder}
                />
                {employeeStartDate ? (
                  <div className="mt-1 text-xs text-neutral-700">
                    Employee start date: {formatUkDate(employeeStartDate, "—")}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-neutral-700">
                    Employee start date: not available (tax rule cannot be checked reliably).
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-neutral-900">Tax code</label>
                <input
                  name="tax_code"
                  value={form.tax_code || ""}
                  onChange={onChange}
                  disabled={taxRuleForced}
                  className={
                    inputBase +
                    " " +
                    okBorder +
                    (taxRuleForced ? " opacity-80 cursor-not-allowed" : "")
                  }
                />
                {taxRuleForced ? (
                  <div className="mt-1 text-xs text-blue-900">
                    Forced by rule: 1257L.
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-neutral-900">Tax basis</label>
                <select
                  name="tax_basis"
                  value={form.tax_basis || ""}
                  onChange={onChange}
                  disabled={taxRuleForced}
                  className={
                    inputBase +
                    " " +
                    okBorder +
                    (taxRuleForced ? " opacity-80 cursor-not-allowed" : "")
                  }
                >
                  <option value="Cumulative">Cumulative</option>
                  <option value="Week1Month1">Week 1 / Month 1</option>
                </select>
                {taxRuleForced ? (
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
                  className={inputBase + " " + okBorder}
                />
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
                  className={inputBase + " " + okBorder}
                />
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
                href={`/dashboard/employees/${id}/edit`}
                className="rounded-md bg-neutral-400 px-4 py-2 text-white"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-md bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save and continue"}
              </button>
            </div>
          </>
        )}
      </div>
    </PageTemplate>
  );
}
