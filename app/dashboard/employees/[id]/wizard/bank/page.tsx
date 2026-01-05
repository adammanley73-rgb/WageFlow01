/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\[id]\wizard\bank\page.tsx

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

type ToastState = {
  open: boolean;
  message: string;
  tone: "error" | "success" | "info";
};

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

  const toastTimerRef = useRef<any>(null);

  function showToast(message: string, tone: ToastState["tone"] = "info") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ open: true, message, tone });
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, open: false }));
    }, 4500);
  }

  const backHref = `/dashboard/employees/${id}/wizard/starter`;

  const [form, setForm] = useState<BankRow>({
    account_name: "",
    sort_code: "",
    account_number: "",
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const r = await fetch(`/api/employees/${id}/bank`, { cache: "no-store" });

        if (r.status === 204 || r.status === 404) return;
        if (!r.ok) throw new Error(`load ${r.status}`);

        if (isJson(r)) {
          const j = await r.json().catch(() => null);
          const d = (j?.data ?? j ?? null) as Partial<BankRow> | null;

          if (alive && d) {
            setForm((prev) => ({
              ...prev,
              account_name: d.account_name ?? prev.account_name,
              sort_code: d.sort_code ?? prev.sort_code,
              account_number: d.account_number ?? prev.account_number,
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
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [id]);

  function onChange(e: any) {
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

  function validate() {
    const missing: string[] = [];
    const invalid: string[] = [];

    const name = String(form.account_name || "").trim();
    const sort = String(form.sort_code || "").trim();
    const acct = String(form.account_number || "").trim();

    if (!name) missing.push("Account name");
    if (!sort) missing.push("Sort code");
    if (!acct) missing.push("Account number");

    if (sort && !isValidSortCode(sort)) invalid.push("Sort code must be in format xx-xx-xx");
    if (acct && !isValidAccountNumber(acct)) invalid.push("Account number must be 8 digits");

    return { ok: missing.length === 0 && invalid.length === 0, missing, invalid };
  }

  async function onSave() {
    const v = validate();

    if (!v.ok) {
      const parts: string[] = [];
      if (v.missing.length) parts.push("Missing: " + v.missing.join(", "));
      if (v.invalid.length) parts.push("Fix: " + v.invalid.join(". "));
      showToast(parts.join(" | "), "error");
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

      // Continue wizard to Emergency step (NOT /edit)
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
                onClick={() => setToast((t) => ({ ...t, open: false }))}
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
                <label className="block text-sm text-neutral-900">Account name</label>
                <input
                  name="account_name"
                  value={form.account_name || ""}
                  onChange={onChange}
                  className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                  placeholder="Name on the account"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-900">Sort code</label>
                <input
                  name="sort_code"
                  value={form.sort_code || ""}
                  onChange={onChange}
                  className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                  inputMode="numeric"
                  placeholder="12-34-56"
                />
                <div className="mt-1 text-xs text-neutral-700">Format: xx-xx-xx (6 digits)</div>
              </div>

              <div>
                <label className="block text-sm text-neutral-900">Account number</label>
                <input
                  name="account_number"
                  value={form.account_number || ""}
                  onChange={onChange}
                  className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                  inputMode="numeric"
                  placeholder="12345678"
                />
                <div className="mt-1 text-xs text-neutral-700">Exactly 8 digits</div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Link href={backHref} className="rounded-md bg-neutral-400 px-4 py-2 text-white">
                Back
              </Link>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-md bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
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
