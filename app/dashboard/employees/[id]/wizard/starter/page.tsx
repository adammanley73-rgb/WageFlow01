/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\[id]\wizard\starter\page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageTemplate from "@/components/ui/PageTemplate";

type StarterRow = {
  p45_provided: boolean;
  starter_declaration: "A" | "B" | "C" | null;
  student_loan_plan: "none" | "plan1" | "plan2" | "plan4" | "plan5" | null;
  postgraduate_loan: boolean;
};

const CARD = "rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6";

export default function StarterDeclarationPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => String(params?.id || ""), [params]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [p45, setP45] = useState(false);
  const [starter, setStarter] = useState<"A" | "B" | "C" | "">("A");
  const [loan, setLoan] = useState<"none" | "plan1" | "plan2" | "plan4" | "plan5">("none");
  const [pgLoan, setPgLoan] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const r = await fetch(`/api/employees/${id}/starter`, { cache: "no-store" });

        if (r.status === 404 || r.status === 204) {
          // Defaults are fine.
        } else if (!r.ok) {
          throw new Error(`load ${r.status}`);
        } else {
          const j = await r.json().catch(() => ({}));
          const d = (j?.data ?? j ?? null) as Partial<StarterRow> | null;

          if (alive && d) {
            setP45(!!d.p45_provided);
            setStarter((d.starter_declaration as any) || "A");
            setLoan((d.student_loan_plan as any) || "none");
            setPgLoan(!!d.postgraduate_loan);
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

  async function onSave() {
    if (!p45 && String(starter || "").trim() === "") {
      alert("Select a Starter Declaration when no P45 is provided.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const body = {
        p45_provided: p45,
        starter_declaration: p45 ? null : starter,
        student_loan_plan: loan === "none" ? null : loan,
        postgraduate_loan: pgLoan,
      };

      const res = await fetch(`/api/employees/${id}/starter`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.detail || json?.error || `save ${res.status}`;
        throw new Error(msg);
      }

      const nextHref = p45
        ? `/dashboard/employees/${id}/wizard/p45`
        : `/dashboard/employees/${id}/wizard/bank`;

      router.push(nextHref);
    } catch (e: any) {
      const msg = String(e?.message || e);
      setErr(msg);
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageTemplate
      title="Starter declaration"
      currentSection="employees"
      headerMode="wizard"
      backHref={`/dashboard/employees/${id}/edit`}
      backLabel="Back"
    >
      <div className={CARD}>
        {loading ? (
          <div>Loading…</div>
        ) : (
          <>
            {err ? (
              <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
                {err}
              </div>
            ) : null}

            <div className="space-y-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={p45}
                  onChange={(e) => setP45(e.target.checked)}
                />
                <span className="text-sm text-neutral-900">P45 provided</span>
              </label>

              <div className="space-y-2">
                <div className="text-sm font-medium text-neutral-900">Starter Declaration</div>
                <select
                  className="w-full rounded-md border border-neutral-400 bg-white p-2"
                  value={starter}
                  onChange={(e) => setStarter(e.target.value as "A" | "B" | "C" | "")}
                  disabled={p45}
                >
                  <option value="">Select…</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-neutral-900">Student loan plan</div>
                <select
                  className="w-full rounded-md border border-neutral-400 bg-white p-2"
                  value={loan}
                  onChange={(e) =>
                    setLoan(e.target.value as "none" | "plan1" | "plan2" | "plan4" | "plan5")
                  }
                >
                  <option value="none">None</option>
                  <option value="plan1">Plan 1</option>
                  <option value="plan2">Plan 2</option>
                  <option value="plan4">Plan 4</option>
                  <option value="plan5">Plan 5</option>
                </select>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pgLoan}
                  onChange={(e) => setPgLoan(e.target.checked)}
                />
                <span className="text-sm text-neutral-900">Postgraduate loan</span>
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
