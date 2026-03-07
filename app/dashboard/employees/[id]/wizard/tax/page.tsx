// C:\Projects\wageflow01\app\dashboard\employees\[id]\wizard\tax\page.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageTemplate from "@/components/ui/PageTemplate";

const CARD = "rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6";

type TaxCodeBasis = "cumulative" | "week1_month1";

type NiCategory =
  | "A"
  | "B"
  | "C"
  | "H"
  | "J"
  | "M"
  | "V"
  | "Z";

type TaxRow = {
  tax_code: string;
  tax_code_basis: TaxCodeBasis;
  ni_category: NiCategory;
  is_director: boolean;
};

type ApiTaxRow = Partial<TaxRow> & {
  tax_basis?: TaxCodeBasis;
};

type FieldErrors = {
  tax_code: string;
  tax_code_basis: string;
  ni_category: string;
};

type ToastState = {
  open: boolean;
  message: string;
  tone: "error" | "success" | "info";
};

function isJson(res: Response) {
  return (res.headers.get("content-type") || "").includes("application/json");
}

/**
 * HMRC tax code validation.
 * Accepts:
 * - standard numeric codes: 1257L
 * - Welsh/Scottish prefixed standard codes: C1257L, S1257L
 * - special codes: BR, D0, D1, NT, 0T
 * - Welsh/Scottish variants where valid: CBR, SBR, CD0, SD0, CD1, SD1, C0T, S0T
 * - Scottish starter/rate variants: SD2 to SD8
 * - K codes: K505, CK505, SK505
 */
function isValidTaxCode(raw: string): boolean {
  const v = raw.trim().toUpperCase();
  if (!v) return false;

  return /^(?:NT|(?:[SC]?)(?:K[1-9][0-9]{0,3}|0T|BR|D0|D1|[0-9]+[A-Z]{1,4})|SD[0-8])$/.test(v);
}

const NI_CATEGORY_LABELS: Record<NiCategory, string> = {
  A: "A – Standard rate",
  B: "B – Married women / widows (reduced rate)",
  C: "C – Over State Pension age",
  H: "H – Apprentice under 25",
  J: "J – Deferred NI",
  M: "M – Under 21",
  V: "V – Veteran",
  Z: "Z – Under 21, deferred NI",
};

const NI_CATEGORIES: NiCategory[] = ["A", "B", "C", "H", "J", "M", "V", "Z"];

function getFieldErrors(form: TaxRow): FieldErrors {
  return {
    tax_code: isValidTaxCode(form.tax_code)
      ? ""
      : "Enter a valid HMRC tax code, e.g. 1257L, S1257L, C1257L, BR, D0, NT, K505, SD2.",
    tax_code_basis:
      form.tax_code_basis === "cumulative" || form.tax_code_basis === "week1_month1"
        ? ""
        : "Select a tax basis.",
    ni_category: NI_CATEGORIES.includes(form.ni_category) ? "" : "Select an NI category.",
  };
}

export default function TaxPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => String(params?.id || ""), [params]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState>({ open: false, message: "", tone: "info" });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<TaxRow>({
    tax_code: "1257L",
    tax_code_basis: "cumulative",
    ni_category: "A",
    is_director: false,
  });

  const [touched, setTouched] = useState({
    tax_code: false,
    tax_code_basis: false,
    ni_category: false,
  });

  function showToast(message: string, tone: ToastState["tone"] = "info") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ open: true, message, tone });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }));
    }, 4500);
  }

  const backHref = `/dashboard/employees/${id}/wizard/declaration`;

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const r = await fetch(`/api/employees/${id}/tax`, { cache: "no-store" });

        if (r.status === 204 || r.status === 404) return;
        if (!r.ok) throw new Error(`load ${r.status}`);

        if (isJson(r)) {
          const j = await r.json().catch(() => null);
          const d = (j?.data ?? j ?? null) as ApiTaxRow | null;

          if (alive && d) {
            const incomingBasis =
              d.tax_code_basis === "week1_month1" || d.tax_basis === "week1_month1"
                ? "week1_month1"
                : "cumulative";

            setForm({
              tax_code: String(d.tax_code || "1257L").trim().toUpperCase(),
              tax_code_basis: incomingBasis,
              ni_category: NI_CATEGORIES.includes(d.ni_category as NiCategory)
                ? (d.ni_category as NiCategory)
                : "A",
              is_director: d.is_director === true,
            });
          }
        }
      } catch (e: unknown) {
        if (alive) setErr(String((e as { message?: string })?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [id]);

  const fieldErrors = useMemo(() => getFieldErrors(form), [form]);

  const canSave = useMemo(
    () => !fieldErrors.tax_code && !fieldErrors.tax_code_basis && !fieldErrors.ni_category,
    [fieldErrors]
  );

  async function onSave() {
    setTouched({ tax_code: true, tax_code_basis: true, ni_category: true });

    if (!canSave) {
      const msg = [fieldErrors.tax_code, fieldErrors.tax_code_basis, fieldErrors.ni_category]
        .filter(Boolean)
        .join(" ");
      showToast(msg, "error");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const payload: TaxRow = {
        tax_code: form.tax_code.trim().toUpperCase(),
        tax_code_basis: form.tax_code_basis,
        ni_category: form.ni_category,
        is_director: form.is_director,
      };

      const res = await fetch(`/api/employees/${id}/tax`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = isJson(res) ? await res.json().catch(() => ({})) : {};
        throw new Error(j?.error || j?.detail || `save ${res.status}`);
      }

      showToast("Tax and NI details saved.", "success");
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

  return (
    <PageTemplate
      title="Tax and NI Details"
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
            {err && (
              <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">{err}</div>
            )}

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="tax_code" className="block text-sm font-medium text-neutral-900">
                  Tax code
                </label>
                <input
                  id="tax_code"
                  name="tax_code"
                  value={form.tax_code}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      tax_code: e.target.value.toUpperCase(),
                    }))
                  }
                  onBlur={() => setTouched((prev) => ({ ...prev, tax_code: true }))}
                  className={inputClass(!!(touched.tax_code && fieldErrors.tax_code))}
                  placeholder="e.g. 1257L"
                  aria-invalid={touched.tax_code && !!fieldErrors.tax_code}
                />
                {touched.tax_code && fieldErrors.tax_code ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.tax_code}</div>
                ) : (
                  <div className="mt-1 text-xs text-neutral-700">
                    Enter the code from the employee&apos;s P45 or HMRC notification. Default is
                    1257L.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900">Tax basis</label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {(
                    [
                      { value: "cumulative", label: "Cumulative" },
                      { value: "week1_month1", label: "Week 1 / Month 1 (emergency)" },
                    ] as { value: TaxCodeBasis; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, tax_code_basis: opt.value }));
                        setTouched((prev) => ({ ...prev, tax_code_basis: true }));
                      }}
                      className={`inline-flex items-center gap-2 rounded-md border border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-900 ${
                        form.tax_code_basis === opt.value ? "ring-2 ring-blue-600" : ""
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {touched.tax_code_basis && fieldErrors.tax_code_basis ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.tax_code_basis}</div>
                ) : (
                  <div className="mt-1 text-xs text-neutral-700">
                    Use Week 1 / Month 1 only where the P45 or HMRC instruction requires it. The
                    default is cumulative.
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="ni_category" className="block text-sm font-medium text-neutral-900">
                  NI category
                </label>
                <select
                  id="ni_category"
                  value={form.ni_category}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      ni_category: e.target.value as NiCategory,
                    }))
                  }
                  onBlur={() => setTouched((prev) => ({ ...prev, ni_category: true }))}
                  className={inputClass(!!(touched.ni_category && fieldErrors.ni_category))}
                  aria-invalid={touched.ni_category && !!fieldErrors.ni_category}
                >
                  {NI_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {NI_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
                {touched.ni_category && fieldErrors.ni_category ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.ni_category}</div>
                ) : (
                  <div className="mt-1 text-xs text-neutral-700">
                    Most employees are category A. Use category V for qualifying veterans where
                    applicable.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900">Director</label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {(
                    [
                      { value: true, label: "Yes" },
                      { value: false, label: "No" },
                    ] as { value: boolean; label: string }[]
                  ).map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, is_director: opt.value }))}
                      className={`inline-flex items-center gap-2 rounded-md border border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-900 ${
                        form.is_director === opt.value ? "ring-2 ring-blue-600" : ""
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-xs text-neutral-700">
                  Directors use the annual NI calculation method. Select Yes only for company
                  directors.
                </div>
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