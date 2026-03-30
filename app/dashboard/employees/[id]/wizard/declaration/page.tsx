"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageTemplate from "@/components/ui/PageTemplate";

const CARD = "rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6";

type StarterDeclaration = "A" | "B" | "C" | "";
type StudentLoanPlan = "none" | "plan1" | "plan2" | "plan4" | "plan5" | "";

type StarterRow = {
  p45_provided: boolean | null;
  starter_declaration: StarterDeclaration | null;
  student_loan_plan: StudentLoanPlan | null;
  postgraduate_loan: boolean | null;
};

type ToastState = {
  open: boolean;
  message: string;
  tone: "error" | "success" | "info";
};

type FieldErrors = {
  starter_declaration: string;
  student_loan_plan: string;
  postgraduate_loan: string;
};

function isJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json");
}

function normaliseBoolean(value: unknown): boolean | null {
  if (
    value === true ||
    value === "true" ||
    value === "yes" ||
    value === "1" ||
    value === 1
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false" ||
    value === "no" ||
    value === "0" ||
    value === 0
  ) {
    return false;
  }

  return null;
}

function normaliseStarterDeclaration(value: unknown): StarterDeclaration {
  const v = String(value ?? "").trim().toUpperCase();
  return v === "A" || v === "B" || v === "C" ? v : "";
}

function normaliseStudentLoanPlan(value: unknown): StudentLoanPlan {
  const v = String(value ?? "").trim().toLowerCase();
  return v === "none" || v === "plan1" || v === "plan2" || v === "plan4" || v === "plan5"
    ? v
    : "";
}

function normaliseStudentLoanPlanFromServer(value: unknown): StudentLoanPlan {
  if (value === null || value === undefined) return "none";
  return normaliseStudentLoanPlan(value) || "none";
}

function buildErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;

  const obj = payload as Record<string, unknown>;

  const details = Array.isArray(obj.details)
    ? obj.details.filter(Boolean).join(" ")
    : typeof obj.details === "string"
    ? obj.details
    : "";

  const message =
    String(obj.message ?? "").trim() ||
    String(obj.error ?? "").trim() ||
    "";

  return [message, details].filter(Boolean).join(" - ") || fallback;
}

function getFieldErrors(form: StarterRow): FieldErrors {
  return {
    starter_declaration: normaliseStarterDeclaration(form.starter_declaration)
      ? ""
      : "Starter Declaration is required.",
    student_loan_plan: normaliseStudentLoanPlan(form.student_loan_plan)
      ? ""
      : "Student loan plan is required.",
    postgraduate_loan:
      normaliseBoolean(form.postgraduate_loan) === null
        ? "Please confirm whether a postgraduate loan applies."
        : "",
  };
}

export default function DeclarationPage() {
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

  const [form, setForm] = useState<StarterRow>({
    p45_provided: false,
    starter_declaration: "",
    student_loan_plan: "",
    postgraduate_loan: null,
  });

  const [touched, setTouched] = useState({
    starter_declaration: false,
    student_loan_plan: false,
    postgraduate_loan: false,
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
    }, 5000);
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const r = await fetch(`/api/employees/${id}/starter`, {
          cache: "no-store",
        });

        if (r.status === 204 || r.status === 404) return;

        let payload: unknown = null;
        if (isJson(r)) {
          payload = await r.json().catch(() => null);
        }

        if (!r.ok) {
          const msg = buildErrorMessage(payload, `load ${r.status}`);
          throw new Error(msg);
        }

        const d =
          payload && typeof payload === "object"
            ? (((payload as Record<string, unknown>).data ??
                payload) as Partial<StarterRow> | null)
            : null;

        if (!alive || !d) return;

        setForm({
          p45_provided: normaliseBoolean(d.p45_provided) ?? false,
          starter_declaration: normaliseStarterDeclaration(d.starter_declaration),
          student_loan_plan: normaliseStudentLoanPlanFromServer(d.student_loan_plan),
          postgraduate_loan: normaliseBoolean(d.postgraduate_loan),
        });
      } catch (e: unknown) {
        if (alive) {
          setErr(String((e as { message?: unknown } | null)?.message ?? e));
        }
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

  const canSave = useMemo(() => {
    return (
      !fieldErrors.starter_declaration &&
      !fieldErrors.student_loan_plan &&
      !fieldErrors.postgraduate_loan
    );
  }, [fieldErrors]);

  async function onSave() {
    setTouched({
      starter_declaration: true,
      student_loan_plan: true,
      postgraduate_loan: true,
    });

    if (!canSave) {
      const msg = [
        fieldErrors.starter_declaration,
        fieldErrors.student_loan_plan,
        fieldErrors.postgraduate_loan,
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
        p45_provided: false,
        starter_declaration: normaliseStarterDeclaration(form.starter_declaration),
        student_loan_plan: normaliseStudentLoanPlan(form.student_loan_plan),
        postgraduate_loan: normaliseBoolean(form.postgraduate_loan),
      };

      const res = await fetch(`/api/employees/${id}/starter`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      let responseJson: unknown = null;
      if (isJson(res)) {
        responseJson = await res.json().catch(() => null);
      }

      if (!res.ok) {
        const msg = buildErrorMessage(responseJson, `save ${res.status}`);
        throw new Error(msg);
      }

      const saved =
        responseJson && typeof responseJson === "object"
          ? (((responseJson as Record<string, unknown>).data ??
              responseJson) as Partial<StarterRow> | null)
          : null;

      if (saved) {
        setForm({
          p45_provided: normaliseBoolean(saved.p45_provided) ?? false,
          starter_declaration: normaliseStarterDeclaration(saved.starter_declaration),
          student_loan_plan: normaliseStudentLoanPlanFromServer(saved.student_loan_plan),
          postgraduate_loan: normaliseBoolean(saved.postgraduate_loan),
        });
      }

      showToast("Starter declaration saved.", "success");
      router.push(`/dashboard/employees/${id}/wizard/tax`);
    } catch (e: unknown) {
      const msg = String((e as { message?: unknown } | null)?.message ?? e);
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

  const radioClass =
    "inline-flex items-center gap-2 rounded-md border border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-900";

  return (
    <PageTemplate
      title="New Starter Declaration"
      currentSection="employees"
      headerMode="wizard"
      backHref={`/dashboard/employees/${id}/wizard/starter`}
      backLabel="Back"
    >
      {toast.open ? (
        <div className="fixed left-1/2 top-4 z-50 w-[min(720px,92vw)] -translate-x-1/2">
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
      ) : null}

      <div className={CARD}>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {err ? (
              <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">{err}</div>
            ) : null}

            <div className="mb-4 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">
              No P45 has been supplied. Complete the New Starter Declaration before continuing.
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="starter_declaration" className="block text-sm font-medium text-neutral-900">
                  Starter Declaration
                </label>
                <select
                  id="starter_declaration"
                  value={normaliseStarterDeclaration(form.starter_declaration)}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      starter_declaration: normaliseStarterDeclaration(e.target.value),
                    }))
                  }
                  onBlur={() => setTouched((prev) => ({ ...prev, starter_declaration: true }))}
                  className={`mt-1 w-full rounded-md border bg-white p-2 ${
                    touched.starter_declaration && fieldErrors.starter_declaration
                      ? "border-red-600 ring-2 ring-red-200"
                      : "border-neutral-400"
                  }`}
                >
                  <option value="">Select declaration</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
                {touched.starter_declaration && fieldErrors.starter_declaration ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.starter_declaration}</div>
                ) : null}
              </div>

              <div>
                <label htmlFor="student_loan_plan" className="block text-sm font-medium text-neutral-900">
                  Student loan plan
                </label>
                <select
                  id="student_loan_plan"
                  value={normaliseStudentLoanPlan(form.student_loan_plan)}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      student_loan_plan: normaliseStudentLoanPlan(e.target.value),
                    }))
                  }
                  onBlur={() => setTouched((prev) => ({ ...prev, student_loan_plan: true }))}
                  className={`mt-1 w-full rounded-md border bg-white p-2 ${
                    touched.student_loan_plan && fieldErrors.student_loan_plan
                      ? "border-red-600 ring-2 ring-red-200"
                      : "border-neutral-400"
                  }`}
                >
                  <option value="">Select student loan plan</option>
                  <option value="none">None</option>
                  <option value="plan1">Plan 1</option>
                  <option value="plan2">Plan 2</option>
                  <option value="plan4">Plan 4</option>
                  <option value="plan5">Plan 5</option>
                </select>
                {touched.student_loan_plan && fieldErrors.student_loan_plan ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.student_loan_plan}</div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900">Postgraduate loan</label>
                <div className="mt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, postgraduate_loan: true }));
                      setTouched((prev) => ({ ...prev, postgraduate_loan: true }));
                    }}
                    className={`${radioClass} ${
                      form.postgraduate_loan === true ? "ring-2 ring-blue-600" : ""
                    }`}
                  >
                    Yes
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, postgraduate_loan: false }));
                      setTouched((prev) => ({ ...prev, postgraduate_loan: true }));
                    }}
                    className={`${radioClass} ${
                      form.postgraduate_loan === false ? "ring-2 ring-blue-600" : ""
                    }`}
                  >
                    No
                  </button>
                </div>
                {touched.postgraduate_loan && fieldErrors.postgraduate_loan ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.postgraduate_loan}</div>
                ) : null}
              </div>
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