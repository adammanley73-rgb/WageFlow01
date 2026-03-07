// C:\Projects\wageflow01\app\dashboard\employees\[id]\wizard\starter\page.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageTemplate from "@/components/ui/PageTemplate";
import { createClient } from "@/lib/supabase/client";

const CARD = "rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6";
const WEEKS_PER_YEAR = 52.14285714;

type EmployeeRow = {
  id?: string | null;
  employee_id?: string | null;
  employee_number?: string | number | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  job_title?: string | null;
  employment_type?: string | null;
  start_date?: string | null;
  date_of_birth?: string | null;
  ni_number?: string | null;
  national_insurance_number?: string | null;
  annual_salary?: number | null;
  hourly_rate?: number | null;
  hours_per_week?: number | null;
};

type StarterTaxRow = {
  p45_provided: boolean | null;
};

type FormState = {
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  start_date: string;
  date_of_birth: string;
  employment_type: string;
  ni_number: string;
  p45_provided: boolean | null;
  annual_salary: string;
  hours_per_week: string;
  hourly_rate: string;
};

type FieldErrors = {
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  start_date: string;
  date_of_birth: string;
  employment_type: string;
  ni_number: string;
  p45_provided: string;
  annual_salary: string;
  hours_per_week: string;
  hourly_rate: string;
  nmw: string;
};

type ToastState = {
  open: boolean;
  message: string;
  tone: "error" | "success" | "info";
};

type EditedPayField = "salary" | "hourly" | null;

function isJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json");
}

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    String(s || "").trim()
  );
}

function str(v: unknown) {
  return String(v || "").trim();
}

function toNumberOrNull(v: unknown) {
  const s = str(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function moneyToString(v: unknown) {
  const n = toNumberOrNull(v);
  return n === null ? "" : String(n);
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

function formatMoneyInput(n: number) {
  return moneyRound(n).toFixed(2).replace(/\.?0+$/, "");
}

function formatRateInput(n: number) {
  return rateRound(n).toFixed(6).replace(/\.?0+$/, "");
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

function isIsoDateOnly(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str(s));
}

function cleanNi(raw: unknown) {
  return String(raw || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

function formatNiInput(raw: string) {
  const cleaned = cleanNi(raw);
  let out = "";
  let pos = 0;

  for (const ch of cleaned) {
    if (pos < 2) {
      if (/[A-Z]/.test(ch)) {
        out += ch;
        pos++;
      }
      continue;
    }

    if (pos < 8) {
      if (/\d/.test(ch)) {
        out += ch;
        pos++;
      }
      continue;
    }

    if (pos < 9) {
      if (/[A-Z]/.test(ch)) {
        out += ch;
        pos++;
      }
      continue;
    }

    break;
  }

  return out.slice(0, 9);
}

function isValidNi(ni: string) {
  return /^[A-Z]{2}\d{6}[A-Z]$/.test(ni);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(email));
}

function normaliseBoolean(value: unknown): boolean | null {
  if (value === true || value === "true" || value === "yes") return true;
  if (value === false || value === "false" || value === "no") return false;
  return null;
}

function calculateAge(dobIso: string, asOf: Date) {
  if (!isIsoDateOnly(dobIso)) return null;

  const [y, m, d] = dobIso.split("-").map(Number);
  const dob = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dob.getTime())) return null;

  let age = asOf.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = asOf.getUTCMonth() - dob.getUTCMonth();
  const dayDiff = asOf.getUTCDate() - dob.getUTCDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;
  return age;
}

function monthsBetween(startIso: string, end: Date) {
  if (!isIsoDateOnly(startIso)) return null;

  const [y, m, d] = startIso.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(start.getTime())) return null;

  let months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth());

  if (end.getUTCDate() < start.getUTCDate()) months--;
  return months;
}

function getCurrentNmwRates(asOf: Date) {
  const threshold = new Date(Date.UTC(2026, 3, 1));

  if (asOf.getTime() >= threshold.getTime()) {
    return {
      over21: 12.71,
      age18to20: 10.85,
      age16to17: 8.0,
      apprentice: 8.0,
      effectiveFrom: "2026-04-01",
    };
  }

  return {
    over21: 12.21,
    age18to20: 10.0,
    age16to17: 7.55,
    apprentice: 7.55,
    effectiveFrom: "2025-04-01",
  };
}

function getApplicableMinimumRate(
  dateOfBirth: string,
  employmentType: string,
  startDate: string
): { rate: number | null; label: string; effectiveFrom: string } {
  const now = new Date();
  const age = calculateAge(dateOfBirth, now);
  const rates = getCurrentNmwRates(now);

  if (age === null) {
    return { rate: null, label: "unknown", effectiveFrom: rates.effectiveFrom };
  }

  const isApprenticeRole = str(employmentType).toLowerCase() === "apprentice";
  const monthsInRole = monthsBetween(startDate, now);
  const apprenticeRateApplies =
    isApprenticeRole && (age < 19 || (age >= 19 && monthsInRole !== null && monthsInRole < 12));

  if (apprenticeRateApplies) {
    return {
      rate: rates.apprentice,
      label: "Apprentice rate",
      effectiveFrom: rates.effectiveFrom,
    };
  }

  if (age >= 21) {
    return {
      rate: rates.over21,
      label: "21 and over",
      effectiveFrom: rates.effectiveFrom,
    };
  }

  if (age >= 18) {
    return {
      rate: rates.age18to20,
      label: "18 to 20",
      effectiveFrom: rates.effectiveFrom,
    };
  }

  return {
    rate: rates.age16to17,
    label: "16 to 17",
    effectiveFrom: rates.effectiveFrom,
  };
}

function getFieldErrors(form: FormState): FieldErrors {
  const annualSalary = toNumberOrNull(form.annual_salary);
  const hoursPerWeek = toNumberOrNull(form.hours_per_week);
  const hourlyRate = toNumberOrNull(form.hourly_rate);
  const ni = cleanNi(form.ni_number);
  const nmwCheck = getApplicableMinimumRate(form.date_of_birth, form.employment_type, form.start_date);

  let nmwError = "";
  if (hourlyRate !== null && nmwCheck.rate !== null && hourlyRate < nmwCheck.rate) {
    nmwError = `Hourly rate is below the legal minimum for ${nmwCheck.label}. Minimum is £${nmwCheck.rate.toFixed(2)}.`;
  }

  return {
    first_name: str(form.first_name) ? "" : "First name is required.",
    last_name: str(form.last_name) ? "" : "Last name is required.",
    email: !str(form.email)
      ? "Email is required."
      : !isValidEmail(form.email)
      ? "Enter a valid email address."
      : "",
    job_title: str(form.job_title) ? "" : "Job title is required.",
    start_date: !str(form.start_date)
      ? "Start date is required."
      : !isIsoDateOnly(form.start_date)
      ? "Start date must be valid."
      : "",
    date_of_birth: !str(form.date_of_birth)
      ? "Date of birth is required."
      : !isIsoDateOnly(form.date_of_birth)
      ? "Date of birth must be valid."
      : "",
    employment_type: str(form.employment_type) ? "" : "Employment type is required.",
    ni_number: !ni
      ? "NI number is required."
      : !isValidNi(ni)
      ? "NI number must be 2 letters, 6 numbers, then 1 letter."
      : "",
    p45_provided: form.p45_provided === null ? "Please confirm whether a P45 has been supplied." : "",
    annual_salary:
      annualSalary === null
        ? "Salary is required."
        : annualSalary <= 0
        ? "Salary must be greater than 0."
        : "",
    hours_per_week:
      hoursPerWeek === null
        ? "Hours per week is required."
        : hoursPerWeek <= 0
        ? "Hours per week must be greater than 0."
        : "",
    hourly_rate:
      hourlyRate === null
        ? "Hourly rate is required."
        : hourlyRate <= 0
        ? "Hourly rate must be greater than 0."
        : "",
    nmw: nmwError,
  };
}

export default function StarterPage() {
  const params = useParams<{ id: string }>();
  const routeId = useMemo(() => String(params?.id || "").trim(), [params]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [employeeRow, setEmployeeRow] = useState<EmployeeRow | null>(null);
  const [lastEditedPayField, setLastEditedPayField] = useState<EditedPayField>(null);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    tone: "info",
  });

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nmwToastKeyRef = useRef<string>("");

  const [form, setForm] = useState<FormState>({
    employee_number: "",
    first_name: "",
    last_name: "",
    email: "",
    job_title: "",
    start_date: "",
    date_of_birth: "",
    employment_type: "",
    ni_number: "",
    p45_provided: null,
    annual_salary: "",
    hours_per_week: "",
    hourly_rate: "",
  });

  const [touched, setTouched] = useState({
    first_name: false,
    last_name: false,
    email: false,
    job_title: false,
    start_date: false,
    date_of_birth: false,
    employment_type: false,
    ni_number: false,
    p45_provided: false,
    annual_salary: false,
    hours_per_week: false,
    hourly_rate: false,
  });

  function showToast(message: string, tone: ToastState["tone"] = "info") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ open: true, message, tone });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }));
    }, 4500);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const supabase = await createClient();

        let employeeData: EmployeeRow | null = null;

        const selectCols = [
          "id",
          "employee_id",
          "employee_number",
          "first_name",
          "last_name",
          "email",
          "job_title",
          "employment_type",
          "start_date",
          "date_of_birth",
          "ni_number",
          "national_insurance_number",
          "annual_salary",
          "hourly_rate",
          "hours_per_week",
        ].join(",");

        const byEmployeeId = await supabase
          .from("employees")
          .select(selectCols)
          .eq("employee_id", routeId)
          .maybeSingle<EmployeeRow>();

        if (byEmployeeId.data) {
          employeeData = byEmployeeId.data;
        } else if (isUuid(routeId)) {
          const byId = await supabase
            .from("employees")
            .select(selectCols)
            .eq("id", routeId)
            .maybeSingle<EmployeeRow>();

          employeeData = byId.data ?? null;
        }

        if (!alive) return;

        if (!employeeData) {
          throw new Error("Employee not found.");
        }

        setEmployeeRow(employeeData);

        const starterRes = await fetch(`/api/employees/${routeId}/starter`, { cache: "no-store" });
        let starterData: StarterTaxRow | null = null;

        if (starterRes.ok && isJson(starterRes)) {
          const j = await starterRes.json().catch(() => null);
          starterData = (j?.data ?? j ?? null) as StarterTaxRow | null;
        }

        if (!alive) return;

        setForm({
          employee_number: str(employeeData.employee_number),
          first_name: str(employeeData.first_name),
          last_name: str(employeeData.last_name),
          email: str(employeeData.email),
          job_title: str(employeeData.job_title),
          start_date: str(employeeData.start_date),
          date_of_birth: str(employeeData.date_of_birth),
          employment_type: str(employeeData.employment_type),
          ni_number: formatNiInput(
            str(employeeData.ni_number || employeeData.national_insurance_number)
          ),
          p45_provided: normaliseBoolean(starterData?.p45_provided),
          annual_salary: moneyToString(employeeData.annual_salary),
          hours_per_week: moneyToString(employeeData.hours_per_week),
          hourly_rate: moneyToString(employeeData.hourly_rate),
        });
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [routeId]);

  const fieldErrors = useMemo(() => getFieldErrors(form), [form]);

  const canSave = useMemo(() => {
    return (
      !fieldErrors.first_name &&
      !fieldErrors.last_name &&
      !fieldErrors.email &&
      !fieldErrors.job_title &&
      !fieldErrors.start_date &&
      !fieldErrors.date_of_birth &&
      !fieldErrors.employment_type &&
      !fieldErrors.ni_number &&
      !fieldErrors.p45_provided &&
      !fieldErrors.annual_salary &&
      !fieldErrors.hours_per_week &&
      !fieldErrors.hourly_rate &&
      !fieldErrors.nmw
    );
  }, [fieldErrors]);

  const nmwInfo = useMemo(() => {
    const hourlyRate = toNumberOrNull(form.hourly_rate);
    const result = getApplicableMinimumRate(form.date_of_birth, form.employment_type, form.start_date);

    return {
      rate: result.rate,
      label: result.label,
      effectiveFrom: result.effectiveFrom,
      compliant: hourlyRate !== null && result.rate !== null ? hourlyRate >= result.rate : false,
      hourlyRate,
    };
  }, [form.date_of_birth, form.employment_type, form.start_date, form.hourly_rate]);

  useEffect(() => {
    const prereqsMet =
      str(form.date_of_birth) &&
      str(form.employment_type) &&
      str(form.start_date) &&
      str(form.hourly_rate);

    if (!prereqsMet) return;
    if (!nmwInfo.compliant || nmwInfo.rate === null || nmwInfo.hourlyRate === null) return;

    const key = `${form.date_of_birth}|${form.employment_type}|${form.start_date}|${form.hourly_rate}|${nmwInfo.effectiveFrom}`;
    if (nmwToastKeyRef.current === key) return;

    nmwToastKeyRef.current = key;
    showToast(
      `Hourly rate complies with NMW. ${nmwInfo.label} minimum is £${nmwInfo.rate.toFixed(
        2
      )} from ${nmwInfo.effectiveFrom}.`,
      "success"
    );
  }, [
    form.date_of_birth,
    form.employment_type,
    form.start_date,
    form.hourly_rate,
    nmwInfo.compliant,
    nmwInfo.rate,
    nmwInfo.label,
    nmwInfo.effectiveFrom,
    nmwInfo.hourlyRate,
  ]);

  function markTouched(name: keyof typeof touched) {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updatePayFields(next: FormState, edited: EditedPayField) {
    const hours = toNumberOrNull(next.hours_per_week);
    const annual = toNumberOrNull(next.annual_salary);
    const hourly = toNumberOrNull(next.hourly_rate);

    if (hours === null || hours <= 0) return next;

    if (edited === "salary" && annual !== null && annual > 0) {
      const derivedHourly = computeEquivalentHourlyRate(annual, hours);
      if (derivedHourly !== null) {
        return {
          ...next,
          hourly_rate: formatRateInput(derivedHourly),
        };
      }
    }

    if (edited === "hourly" && hourly !== null && hourly > 0) {
      const derivedSalary = computeAnnualSalary(hourly, hours);
      if (derivedSalary !== null) {
        return {
          ...next,
          annual_salary: formatMoneyInput(derivedSalary),
        };
      }
    }

    if (edited === null) {
      if (annual !== null && annual > 0 && (!str(next.hourly_rate) || hourly === null || hourly <= 0)) {
        const derivedHourly = computeEquivalentHourlyRate(annual, hours);
        if (derivedHourly !== null) {
          return {
            ...next,
            hourly_rate: formatRateInput(derivedHourly),
          };
        }
      }

      if (hourly !== null && hourly > 0 && (!str(next.annual_salary) || annual === null || annual <= 0)) {
        const derivedSalary = computeAnnualSalary(hourly, hours);
        if (derivedSalary !== null) {
          return {
            ...next,
            annual_salary: formatMoneyInput(derivedSalary),
          };
        }
      }
    }

    return next;
  }

  function onHoursChange(value: string) {
    setForm((prev) => updatePayFields({ ...prev, hours_per_week: value }, lastEditedPayField));
  }

  function onSalaryChange(value: string) {
    setLastEditedPayField("salary");
    setForm((prev) => updatePayFields({ ...prev, annual_salary: value }, "salary"));
  }

  function onHourlyChange(value: string) {
    setLastEditedPayField("hourly");
    setForm((prev) => updatePayFields({ ...prev, hourly_rate: value }, "hourly"));
  }

  function inputClass(hasError: boolean) {
    return `mt-1 w-full rounded-md border bg-white p-2 outline-none ${
      hasError ? "border-red-600 ring-2 ring-red-200" : "border-neutral-400"
    }`;
  }

  async function onSave() {
    setTouched({
      first_name: true,
      last_name: true,
      email: true,
      job_title: true,
      start_date: true,
      date_of_birth: true,
      employment_type: true,
      ni_number: true,
      p45_provided: true,
      annual_salary: true,
      hours_per_week: true,
      hourly_rate: true,
    });

    if (!canSave) {
      const msg = [
        fieldErrors.first_name,
        fieldErrors.last_name,
        fieldErrors.email,
        fieldErrors.job_title,
        fieldErrors.start_date,
        fieldErrors.date_of_birth,
        fieldErrors.employment_type,
        fieldErrors.ni_number,
        fieldErrors.p45_provided,
        fieldErrors.annual_salary,
        fieldErrors.hours_per_week,
        fieldErrors.hourly_rate,
        fieldErrors.nmw,
      ]
        .filter(Boolean)
        .join(" ");

      showToast(msg || "Starter details are invalid.", "error");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const supabase = await createClient();

      const matchCol =
        employeeRow?.employee_id && String(employeeRow.employee_id).trim() === routeId
          ? "employee_id"
          : isUuid(routeId)
          ? "id"
          : "employee_id";

      const ni = cleanNi(form.ni_number);
      const annualSalary = toNumberOrNull(form.annual_salary);
      const hoursPerWeek = toNumberOrNull(form.hours_per_week);
      const hourlyRate = toNumberOrNull(form.hourly_rate);

      const updatePayload = {
        first_name: str(form.first_name),
        last_name: str(form.last_name),
        email: str(form.email),
        job_title: str(form.job_title),
        start_date: str(form.start_date),
        date_of_birth: str(form.date_of_birth),
        employment_type: str(form.employment_type),
        ni_number: ni,
        national_insurance_number: ni,
        annual_salary: annualSalary !== null ? moneyRound(annualSalary) : null,
        hours_per_week: hoursPerWeek !== null ? moneyRound(hoursPerWeek) : null,
        hourly_rate: hourlyRate !== null ? rateRound(hourlyRate) : null,
      };

      const employeeUpdate = await supabase
        .from("employees")
        .update(updatePayload)
        .eq(matchCol, routeId);

      if (employeeUpdate.error) {
        throw new Error(employeeUpdate.error.message);
      }

      const starterPayload: Record<string, unknown> = {
        p45_provided: form.p45_provided,
      };

      const starterRes = await fetch(`/api/employees/${routeId}/starter`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(starterPayload),
      });

      if (!starterRes.ok) {
        const j = isJson(starterRes) ? await starterRes.json().catch(() => ({})) : {};
        const detail =
          j?.message ||
          (Array.isArray(j?.details) ? j.details.join(" ") : "") ||
          j?.error ||
          `save ${starterRes.status}`;
        throw new Error(detail || "Starter details are invalid.");
      }

      showToast("Starter details saved.", "success");

      if (form.p45_provided === true) {
        router.push(`/dashboard/employees/${routeId}/wizard/p45`);
        return;
      }

      router.push(`/dashboard/employees/${routeId}/wizard/declaration`);
    } catch (e: any) {
      const msg = String(e?.message || e);
      setErr(msg);
      showToast(msg || "Starter details are invalid.", "error");
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
      title="New Starter"
      currentSection="employees"
      headerMode="wizard"
      backHref={`/dashboard/employees/${routeId}`}
      backLabel="Back"
    >
      {toast.open ? (
        <div className="fixed left-1/2 top-4 z-50 w-[min(760px,92vw)] -translate-x-1/2">
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-neutral-900">Employee number</label>
                <input
                  value={form.employee_number || "Will be assigned automatically"}
                  readOnly
                  className="mt-1 w-full rounded-md border border-neutral-300 bg-neutral-100 p-2 text-neutral-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900">
                  Has a P45 been supplied?
                </label>
                <div className="mt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setField("p45_provided", true);
                      markTouched("p45_provided");
                    }}
                    className={`rounded-md border bg-white px-4 py-2 text-sm ${
                      form.p45_provided === true
                        ? "border-blue-700 ring-2 ring-blue-200"
                        : "border-neutral-400"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setField("p45_provided", false);
                      markTouched("p45_provided");
                    }}
                    className={`rounded-md border bg-white px-4 py-2 text-sm ${
                      form.p45_provided === false
                        ? "border-blue-700 ring-2 ring-blue-200"
                        : "border-neutral-400"
                    }`}
                  >
                    No
                  </button>
                </div>
                {touched.p45_provided && fieldErrors.p45_provided ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.p45_provided}</div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-neutral-900">First name</label>
                <input
                  value={form.first_name}
                  onChange={(e) => setField("first_name", e.target.value)}
                  onBlur={() => markTouched("first_name")}
                  className={inputClass(!!(touched.first_name && fieldErrors.first_name))}
                />
                {touched.first_name && fieldErrors.first_name ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.first_name}</div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-neutral-900">Last name</label>
                <input
                  value={form.last_name}
                  onChange={(e) => setField("last_name", e.target.value)}
                  onBlur={() => markTouched("last_name")}
                  className={inputClass(!!(touched.last_name && fieldErrors.last_name))}
                />
                {touched.last_name && fieldErrors.last_name ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.last_name}</div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-neutral-900">Date of birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => setField("date_of_birth", e.target.value)}
                  onBlur={() => markTouched("date_of_birth")}
                  className={inputClass(!!(touched.date_of_birth && fieldErrors.date_of_birth))}
                />
                {touched.date_of_birth && fieldErrors.date_of_birth ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.date_of_birth}</div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-neutral-900">NI number</label>
                <input
                  value={form.ni_number}
                  onChange={(e) => setField("ni_number", formatNiInput(e.target.value))}
                  onBlur={() => markTouched("ni_number")}
                  className={inputClass(!!(touched.ni_number && fieldErrors.ni_number))}
                  placeholder="AB123456C"
                  maxLength={9}
                />
                {touched.ni_number && fieldErrors.ni_number ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.ni_number}</div>
                ) : (
                  <div className="mt-1 text-xs text-neutral-700">
                    Format: 2 letters, 6 numbers, 1 letter. No spaces.
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-neutral-900">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  onBlur={() => markTouched("email")}
                  className={inputClass(!!(touched.email && fieldErrors.email))}
                  inputMode="email"
                />
                {touched.email && fieldErrors.email ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.email}</div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-neutral-900">Job title</label>
                <input
                  value={form.job_title}
                  onChange={(e) => setField("job_title", e.target.value)}
                  onBlur={() => markTouched("job_title")}
                  className={inputClass(!!(touched.job_title && fieldErrors.job_title))}
                />
                {touched.job_title && fieldErrors.job_title ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.job_title}</div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-neutral-900">Start date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setField("start_date", e.target.value)}
                  onBlur={() => markTouched("start_date")}
                  className={inputClass(!!(touched.start_date && fieldErrors.start_date))}
                />
                {touched.start_date && fieldErrors.start_date ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.start_date}</div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-neutral-900">Employment type</label>
                <select
                  value={form.employment_type}
                  onChange={(e) => setField("employment_type", e.target.value)}
                  onBlur={() => markTouched("employment_type")}
                  className={inputClass(!!(touched.employment_type && fieldErrors.employment_type))}
                >
                  <option value="">Select employment type</option>
                  <option value="full_time">Full time</option>
                  <option value="part_time">Part time</option>
                  <option value="casual">Casual</option>
                  <option value="apprentice">Apprentice</option>
                  <option value="contractor">Contractor</option>
                </select>
                {touched.employment_type && fieldErrors.employment_type ? (
                  <div className="mt-1 text-xs text-red-700">{fieldErrors.employment_type}</div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-neutral-400 bg-white p-4">
              <div className="text-sm font-semibold text-neutral-900">Pay details</div>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm text-neutral-900">Salary (£)</label>
                  <input
                    value={form.annual_salary}
                    onChange={(e) => onSalaryChange(e.target.value)}
                    onBlur={() => markTouched("annual_salary")}
                    className={inputClass(!!(touched.annual_salary && fieldErrors.annual_salary))}
                    inputMode="decimal"
                    placeholder="30000"
                  />
                  {touched.annual_salary && fieldErrors.annual_salary ? (
                    <div className="mt-1 text-xs text-red-700">{fieldErrors.annual_salary}</div>
                  ) : (
                    <div className="mt-1 text-xs text-neutral-700">
                      Auto-calculates if Hours per week and Hourly rate are entered.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-neutral-900">Hours per week</label>
                  <input
                    value={form.hours_per_week}
                    onChange={(e) => onHoursChange(e.target.value)}
                    onBlur={() => markTouched("hours_per_week")}
                    className={inputClass(!!(touched.hours_per_week && fieldErrors.hours_per_week))}
                    inputMode="decimal"
                    placeholder="37.5"
                  />
                  {touched.hours_per_week && fieldErrors.hours_per_week ? (
                    <div className="mt-1 text-xs text-red-700">{fieldErrors.hours_per_week}</div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-sm text-neutral-900">Hourly rate (£)</label>
                  <input
                    value={form.hourly_rate}
                    onChange={(e) => onHourlyChange(e.target.value)}
                    onBlur={() => markTouched("hourly_rate")}
                    className={inputClass(
                      !!(touched.hourly_rate && (fieldErrors.hourly_rate || fieldErrors.nmw))
                    )}
                    inputMode="decimal"
                    placeholder="12.50"
                  />
                  {touched.hourly_rate && fieldErrors.hourly_rate ? (
                    <div className="mt-1 text-xs text-red-700">{fieldErrors.hourly_rate}</div>
                  ) : fieldErrors.nmw ? (
                    <div className="mt-1 text-xs text-red-700">{fieldErrors.nmw}</div>
                  ) : (
                    <div className="mt-1 text-xs text-neutral-700">
                      Auto-calculates if Salary and Hours per week are entered.
                    </div>
                  )}
                </div>
              </div>

              {nmwInfo.rate !== null ? (
                <div className="mt-3 text-xs text-neutral-700">
                  Current minimum used for validation: {nmwInfo.label}, £{nmwInfo.rate.toFixed(2)} from{" "}
                  {nmwInfo.effectiveFrom}.
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Link
                href={`/dashboard/employees/${routeId}`}
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