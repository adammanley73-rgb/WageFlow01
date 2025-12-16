/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\[id]\wizard\bank\page.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageTemplate from "@/components/ui/PageTemplate";

const CARD = "rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6";

const BTN_PRIMARY =
  "rounded-md bg-blue-700 px-4 py-2 text-white disabled:opacity-50";
const BTN_SECONDARY = "rounded-md bg-neutral-400 px-4 py-2 text-white";

type BankRow = {
  account_name: string | null;
  sort_code: string | null;
  account_number: string | null;
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

  const [form, setForm] = useState<BankRow>({
    account_name: "",
    sort_code: "",
    account_number: "",
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!id) return;

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

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.name;
    const value = e.target.value;

    setForm((prev) => {
      if (name === "sort_code") return { ...prev, sort_code: formatSortCode(value) };
      if (name === "account_number")
        return { ...prev, account_number: formatAccountNumber(value) };
      return { ...prev, [name]: value };
    });
  }

  async function onSave() {
    if (!id) return;

    const account_name = String(form.account_name || "").trim();
    const sort_code = String(form.sort_code || "").trim();
    const account_number = String(form.account_number || "").trim();

    if (!account_name) {
      showToast("Account name is required.", "error");
      return;
    }

    if (!isValidSortCode(sort_code)) {
      showToast("Sort code must be in format 12-34-56.", "error");
      return;
    }

    if (!isValidAccountNumber(account_number)) {
      showToast("Account number must be exactly 8 digits.", "error");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const res = await fetch(`/api/employees/${id}/bank`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          employee_id: id,
          account_name,
          sort_code,
          account_number,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) {
        throw new Error(j?.error || `save ${res.status}`);
      }

      showToast("Bank details saved.", "success");

      // Next step in wizard
      router.push(`/dashboard/employees/${id}/wizard/emergency`);
    } catch (e: any) {
      const msg = String(e?.message || e);
      setErr(msg);
      showToast(msg, "error");
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
      backHref={`/dashboard/employees/${id}/wizard/p45`}
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
              <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
                {err}
              </div>
            ) : null}

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 text-center">Bank details</h2>
              <p className="mt-1 text-sm text-neutral-800 text-center">
                Enter UK bank details for payroll payments.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm text-neutral-900">Account name</label>
                <input
                  name="account_name"
                  value={form.account_name || ""}
                  onChange={onChange}
                  className="mt-1 w-full rounded-md border border-neutral-400 bg-white p-2"
                  placeholder="Name on the account"
                  autoComplete="name"
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
                  autoComplete="off"
                />
                <div className="mt-1 text-xs text-neutral-700">Format: 12-34-56</div>
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
                  autoComplete="off"
                />
                <div className="mt-1 text-xs text-neutral-700">Exactly 8 digits</div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Link href={`/dashboard/employees/${id}/wizard/p45`} className={BTN_SECONDARY}>
                Cancel
              </Link>
              <button type="button" onClick={onSave} disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Saving..." : "Save and continue"}
              </button>
            </div>
          </>
        )}
      </div>
    </PageTemplate>
  );
}
