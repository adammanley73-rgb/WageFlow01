// C:\Projects\wageflow01\app\dashboard\employees\[id]\wizard\bank\page.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageTemplate from "@/components/ui/PageTemplate";

const CARD = "rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6";

type BankRow = {
  account_name: string | null;
  sort_code: string | null;
  account_number: string | null;
};

type FieldErrors = {
  account_name: string;
  sort_code: string;
  account_number: string;
};

type ToastState = {
  open: boolean;
  message: string;
  tone: "error" | "success" | "info";
};

function isJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json");
}

function digitsOnly(s: string) {
  return String(s || "").replace(/\D/g, "");
}

function formatSortCode(input: string) {
  const d = digitsOnly(input).slice(0, 6);
  const a = d.slice(0, 2);
  const b = d.slice(2, 4);
  const c = d.slice(4, 6);

  if (d.length <= 2) return a;
  if (d.length <= 4) return `${a}-${b}`;
  return `${a}-${b}-${c}`;
}

function isValidSortCode(s: string) {
  return /^\d{2}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

function formatAccountNumber(input: string) {
  return digitsOnly(input).slice(0, 8);
}

function isValidAccountNumber(s: string) {
  return /^\d{8}$/.test(String(s || "").trim());
}

function getFieldErrors(form: BankRow): FieldErrors {
  const accountName = String(form.account_name || "").trim();
  const sortCode = String(form.sort_code || "").trim();
  const accountNumber = String(form.account_number || "").trim();

  return {
    account_name: accountName ? "" : "Account name is required.",
    sort_code: !sortCode
      ? "Sort code is required."
      : !isValidSortCode(sortCode)
      ? "Sort code must be in format xx-xx-xx."
      : "",
    account_number: !accountNumber
      ? "Account number is required."
      : !isValidAccountNumber(accountNumber)
      ? "Account number must be exactly 8 digits."
      : "",
  };
}

export default function BankPage() {
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

  const [form, setForm] = useState<BankRow>({
    account_name: "",
    sort_code: "",
    account_number: "",
  });

  const [touched, setTouched] = useState({
    account_name: false,
    sort_code: false,
    account_number: false,
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

  // ── Back now goes to tax step ──────────────────────────────────────────────
  const backHref = `/dashboard/employees/${id}/wizard/tax`;

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const r = await fetch(`/api/employees/${id}/bank`, { cache: "no-store" });

        if (r.status === 204 || r.status === 404) {
          return;
        }

        if (!r.ok) {
          throw new Error(`load ${r.status}`);
        }

        if (isJson(r)) {
          const j = await r.json().catch(() => null);
          const d = (j?.data ?? j ?? null) as Partial<BankRow> | null;

          if (alive && d) {
            setForm({
              account_name: d.account_name ?? "",
              sort_code: d.sort_code ?? "",
              account_number: d.account_number ?? "",
            });
          }
        }
      } catch (e: any) {
        if (alive) {
          setErr(String(e?.message || e));
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

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    if (name === "sort_code") {
      setForm((prev) => ({ ...prev, sort_code: formatSortCode(value) }));
      return;
    }

    if (name === "account_number") {
      setForm((prev) => ({ ...prev, account_number: formatAccountNumber(value) }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    const { name } = e.target;

    if (name === "account_name" || name === "sort_code" || name === "account_number") {
      setTouched((prev) => ({ ...prev, [name]: true }));
    }
  }

  const fieldErrors = useMemo(() => getFieldErrors(form), [form]);

  const canSave = useMemo(() => {
    return !fieldErrors.account_name && !fieldErrors.sort_code && !fieldErrors.account_number;
  }, [fieldErrors]);

  async function onSave() {
    const nextTouched = {
      account_name: true,
      sort_code: true,
      account_number: true,
    };

    setTouched(nextTouched);

    if (!canSave) {
      const parts: string[] = [];

      if (fieldErrors.account_name) parts.push(fieldErrors.account_name);
      if (fieldErrors.sort_code) parts.push(fieldErrors.sort_code);
      if (fieldErrors.account_number) parts.push(fieldErrors.account_number);

      showToast(parts.join(" "), "error");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const payload: BankRow = {
        account_name: String(form.account_name || "").trim(),
        sort_code: String(form.sort_code || "").trim(),
        account_number: String(form.account_number || "").trim(),
      };

      const res = await fetch(`/api/employees/${id}/bank`, {
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

      showToast("Bank details saved.", "success");
      router.push(`/dashboard/employees/${id}/wizard/emergency`);
    } catch (e: any) {
      const msg = String(e?.message || e);
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
      title="Bank Details"
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

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="account_name" className="block text-sm text-neutral-900">
                  Account name
                </label>
                <input
                  id="account_name"
                  name="account_name"
                  value={form.account_name || ""}
                  onChange={onChange}
                  onBlur={onBlur}
                  className={inputClass(!!(touched.account_name && fieldErrors.account_name))}
                  placeholder="Name on the account"
                  aria-invalid={touched.account_name && !!fieldErrors.account_name}
                />
                {touched.account_name && fieldErrors.account_name ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.account_name}</div>
                ) : null}
              </div>

              <div>
                <label htmlFor="sort_code" className="block text-sm text-neutral-900">
                  Sort code
                </label>
                <input
                  id="sort_code"
                  name="sort_code"
                  value={form.sort_code || ""}
                  onChange={onChange}
                  onBlur={onBlur}
                  className={inputClass(!!(touched.sort_code && fieldErrors.sort_code))}
                  inputMode="numeric"
                  placeholder="12-34-56"
                  aria-invalid={touched.sort_code && !!fieldErrors.sort_code}
                />
                {touched.sort_code && fieldErrors.sort_code ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.sort_code}</div>
                ) : (
                  <div className="mt-1 text-xs text-neutral-700">Format: xx-xx-xx</div>
                )}
              </div>

              <div>
                <label htmlFor="account_number" className="block text-sm text-neutral-900">
                  Account number
                </label>
                <input
                  id="account_number"
                  name="account_number"
                  value={form.account_number || ""}
                  onChange={onChange}
                  onBlur={onBlur}
                  className={inputClass(!!(touched.account_number && fieldErrors.account_number))}
                  inputMode="numeric"
                  placeholder="12345678"
                  aria-invalid={touched.account_number && !!fieldErrors.account_number}
                />
                {touched.account_number && fieldErrors.account_number ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.account_number}</div>
                ) : (
                  <div className="mt-1 text-xs text-neutral-700">Exactly 8 digits</div>
                )}
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
