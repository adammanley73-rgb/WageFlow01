/* C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\[id]\edit\page.tsx */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageTemplate from "@/components/layout/PageTemplate";
import { createClient } from "@/lib/supabase/client";
import ActiveCompanyBannerClient from "@/components/ui/ActiveCompanyBannerClient";

type ActiveCompany = { id: string; name: string | null } | null;

type EmployeeRow = {
  id?: string | null;
  employee_id?: string | null;
  company_id?: string | null;

  employee_number?: any | null;

  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;

  job_title?: string | null;
  employment_type?: string | null;

  start_date?: string | null;
  date_of_birth?: string | null;

  pay_frequency?: string | null;

  annual_salary?: any | null;
  hourly_rate?: any | null;
  hours_per_week?: any | null;

  ni_number?: string | null;
  national_insurance_number?: string | null;

  address?: any | null;

  [key: string]: any;
};

type FormState = {
  employee_number: string;

  first_name: string;
  last_name: string;
  email: string;

  job_title: string;
  employment_type: string;

  start_date: string;
  date_of_birth: string;

  pay_frequency: string;

  annual_salary: string;
  hourly_rate: string;
  hours_per_week: string;

  ni_number: string;

  address_line1: string;
  address_line2: string;
  town_city: string;
  county: string;
  postcode: string;
  country: string;
};

const CARD = "rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6";
const BTN_PRIMARY =
  "w-44 inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-2 text-white disabled:opacity-60";
const BTN_SECONDARY =
  "w-32 inline-flex items-center justify-center rounded-lg border border-neutral-400 bg-white px-4 py-2 text-neutral-800 hover:bg-neutral-100 disabled:opacity-60";

const WEEKS_PER_YEAR = 52.14285714;
const OVERRIDE_DIFF_THRESHOLD = 0.05;

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    String(s || "").trim()
  );
}

function cleanNi(raw: any) {
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

function toNumberOrNull(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function roundTo(n: number, dp: number) {
  const p = Math.pow(10, dp);
  return Math.round((n + Number.EPSILON) * p) / p;
}

function moneyRound(n: number) {
  return roundTo(n, 2);
}

function hoursRound(n: number) {
  return roundTo(n, 2);
}

function rateRound(n: number) {
  return roundTo(n, 6);
}

function computeEquivalentHourlyRate(annualSalary: number, hoursPerWeek: number) {
  if (!Number.isFinite(annualSalary) || !Number.isFinite(hoursPerWeek)) return null;
  if (annualSalary <= 0 || hoursPerWeek <= 0) return null;
  return annualSalary / (WEEKS_PER_YEAR * hoursPerWeek);
}

function normalizeAddress(address: any) {
  const a = address || {};
  const line1 = a.line1 ?? a.address_line1 ?? a.line_1 ?? "";
  const line2 = a.line2 ?? a.address_line2 ?? a.line_2 ?? "";
  const town_city = a.town_city ?? a.city ?? a.town ?? a.locality ?? "";
  const county = a.county ?? a.region ?? "";
  const postcode = a.postcode ?? a.post_code ?? a.zip ?? "";
  const country = a.country ?? "United Kingdom";

  return {
    line1: String(line1 || "").trim(),
    line2: String(line2 || "").trim(),
    town_city: String(town_city || "").trim(),
    county: String(county || "").trim(),
    postcode: String(postcode || "").trim(),
    country: String(country || "").trim(),
  };
}

function isAllowedPayFrequency(v: string) {
  return ["weekly", "fortnightly", "four_weekly", "monthly"].includes(String(v || "").trim());
}

function extractMissingColumn(message: string): string | null {
  const msg = String(message || "");

  let m = msg.match(/column\s+employees\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (m && m[1]) return m[1];

  m = msg.match(/column\s+"([a-zA-Z0-9_]+)"\s+does not exist/i);
  if (m && m[1]) return m[1];

  m = msg.match(/Could not find the '([a-zA-Z0-9_]+)' column/i);
  if (m && m[1]) return m[1];

  return null;
}

function looksLikeMissingColumn(err: any, col: string) {
  const msg = String(err?.message || err || "");
  return msg.toLowerCase().includes(`column employees.${String(col).toLowerCase()} does not exist`);
}

export default function EditEmployeePage() {
  const params = useParams<{ id: string }>();
  const routeId = useMemo(() => String(params?.id || "").trim(), [params]);
  const router = useRouter();

  const [company, setCompany] = useState<ActiveCompany>(null);
  const [companyErr, setCompanyErr] = useState<string | null>(null);
  const companyLoading = !company && !companyErr;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [employee, setEmployee] = useState<EmployeeRow | null>(null);

  const [hourlyRateTouched, setHourlyRateTouched] = useState(false);

  const [form, setForm] = useState<FormState>({
    employee_number: "",

    first_name: "",
    last_name: "",
    email: "",

    job_title: "",
    employment_type: "full_time",

    start_date: "",
    date_of_birth: "",

    pay_frequency: "monthly",

    annual_salary: "",
    hourly_rate: "",
    hours_per_week: "",

    ni_number: "",

    address_line1: "",
    address_line2: "",
    town_city: "",
    county: "",
    postcode: "",
    country: "United Kingdom",
  });

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function deriveHourlyStringFromForm(annualSalaryStr: string, hoursStr: string) {
    const annual = toNumberOrNull(annualSalaryStr);
    const hours = toNumberOrNull(hoursStr);
    if (annual === null || hours === null) return null;
    const derived = computeEquivalentHourlyRate(annual, hours);
    if (derived === null) return null;
    return rateRound(derived).toFixed(6);
  }

  const derivedHourlyStr = useMemo(() => {
    return deriveHourlyStringFromForm(form.annual_salary, form.hours_per_week);
  }, [form.annual_salary, form.hours_per_week]);

  const derivedHourlyNum = useMemo(() => {
    return derivedHourlyStr ? toNumberOrNull(derivedHourlyStr) : null;
  }, [derivedHourlyStr]);

  const currentHourlyNum = useMemo(() => {
    return toNumberOrNull(form.hourly_rate);
  }, [form.hourly_rate]);

  const hourlyLooksOverridden = useMemo(() => {
    if (derivedHourlyNum === null) return false;
    if (currentHourlyNum === null) return false;
    return Math.abs(currentHourlyNum - derivedHourlyNum) >= OVERRIDE_DIFF_THRESHOLD;
  }, [currentHourlyNum, derivedHourlyNum]);

  useEffect(() => {
    let ignore = false;

    async function loadActiveCompany() {
      try {
        setCompanyErr(null);
        const res = await fetch("/api/active-company", { cache: "no-store" });
        if (ignore) return;

        if (res.status === 204) {
          setCompany(null);
          setCompanyErr("No active company selected.");
          return;
        }

        const data = await res.json().catch(() => ({} as any));
        if (ignore) return;

        if (data?.ok && data?.company?.id) {
          setCompany({ id: String(data.company.id), name: data.company.name ?? null });
          return;
        }

        if (data?.id) {
          setCompany({ id: String(data.id), name: data.name ?? null });
          return;
        }

        setCompany(null);
        setCompanyErr(data?.error || "No active company selected.");
      } catch {
        if (ignore) return;
        setCompany(null);
        setCompanyErr("Could not load active company.");
      }
    }

    loadActiveCompany();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadEmployee() {
      if (!routeId) {
        setErr("Missing employee id.");
        setLoading(false);
        return;
      }

      if (companyLoading) return;

      const companyId = company?.id ? String(company.id) : "";
      if (companyErr || !companyId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErr(null);

        const supabase = createClient();
        const selectCols = "*";

        async function tryBy(col: "id" | "employee_id", value: string) {
          return await supabase
            .from("employees")
            .select(selectCols)
            .eq("company_id", companyId)
            .eq(col, value)
            .maybeSingle<EmployeeRow>();
        }

        let data: EmployeeRow | null = null;
        let error: any = null;

        if (isUuid(routeId)) {
          const r1 = await tryBy("id", routeId);
          if (!alive) return;

          if (r1.error && looksLikeMissingColumn(r1.error, "id")) {
            error = r1.error;
          } else {
            data = (r1.data as any) ?? null;
            error = r1.error ?? null;
          }

          if (!data) {
            const r2 = await tryBy("employee_id", routeId);
            if (!alive) return;

            if (r2.error && looksLikeMissingColumn(r2.error, "employee_id")) {
              // ignore
            } else {
              data = (r2.data as any) ?? null;
              error = r2.error ?? error;
            }
          }
        } else {
          const r1 = await tryBy("employee_id", routeId);
          if (!alive) return;

          if (r1.error && looksLikeMissingColumn(r1.error, "employee_id")) {
            // ignore
          } else {
            data = (r1.data as any) ?? null;
            error = r1.error ?? null;
          }

          if (!data) {
            const r2 = await tryBy("id", routeId);
            if (!alive) return;

            if (r2.error && looksLikeMissingColumn(r2.error, "id")) {
              error = r2.error;
            } else {
              data = (r2.data as any) ?? null;
              error = r2.error ?? error;
            }
          }
        }

        if (error && !data) throw new Error(String(error?.message || error));
        if (!data) {
          setEmployee(null);
          setErr("Employee not found for the active company.");
          return;
        }

        setEmployee(data);

        const addr = normalizeAddress((data as any).address);

        const nextForm: FormState = {
          employee_number: String((data as any).employee_number || "").trim(),

          first_name: String((data as any).first_name || "").trim(),
          last_name: String((data as any).last_name || "").trim(),
          email: String((data as any).email || "").trim(),

          job_title: String((data as any).job_title || "").trim(),
          employment_type: String((data as any).employment_type || "full_time").trim() || "full_time",

          start_date: String((data as any).start_date || "").trim(),
          date_of_birth: String((data as any).date_of_birth || "").trim(),

          pay_frequency: String((data as any).pay_frequency || "monthly").trim() || "monthly",

          annual_salary:
            (data as any).annual_salary !== null && (data as any).annual_salary !== undefined
              ? String((data as any).annual_salary)
              : "",
          hourly_rate:
            (data as any).hourly_rate !== null && (data as any).hourly_rate !== undefined
              ? String((data as any).hourly_rate)
              : "",
          hours_per_week:
            (data as any).hours_per_week !== null && (data as any).hours_per_week !== undefined
              ? String((data as any).hours_per_week)
              : "",

          ni_number: formatNiInput(
            String((data as any).ni_number || (data as any).national_insurance_number || "").trim()
          ),

          address_line1: addr.line1,
          address_line2: addr.line2,
          town_city: addr.town_city,
          county: addr.county,
          postcode: addr.postcode,
          country: addr.country || "United Kingdom",
        };

        const derivedOnLoadStr = deriveHourlyStringFromForm(nextForm.annual_salary, nextForm.hours_per_week);
        const derivedOnLoadNum = derivedOnLoadStr ? toNumberOrNull(derivedOnLoadStr) : null;
        const storedHourlyNum = toNumberOrNull(nextForm.hourly_rate);

        let isOverride = false;
        if (derivedOnLoadNum !== null && storedHourlyNum !== null) {
          isOverride = Math.abs(storedHourlyNum - derivedOnLoadNum) >= OVERRIDE_DIFF_THRESHOLD;
        }

        if (derivedOnLoadStr) {
          const treatAsMissing =
            !String(nextForm.hourly_rate || "").trim() || storedHourlyNum === null || storedHourlyNum <= 0;
          if (treatAsMissing) nextForm.hourly_rate = derivedOnLoadStr;
        }

        setForm(nextForm);
        setHourlyRateTouched(isOverride);
      } catch (e: any) {
        if (!alive) return;
        setEmployee(null);
        setErr(String(e?.message || e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    loadEmployee();
    return () => {
      alive = false;
    };
  }, [routeId, company?.id, companyErr, companyLoading]);

  useEffect(() => {
    if (hourlyRateTouched) return;

    const derivedStr = derivedHourlyStr;
    if (!derivedStr) return;

    const currentStr = String(form.hourly_rate || "").trim();
    const currentNum = toNumberOrNull(currentStr);

    const treatAsMissing = !currentStr || currentNum === null || currentNum <= 0;
    if (treatAsMissing) {
      setField("hourly_rate", derivedStr);
      return;
    }

    if (currentStr !== derivedStr) {
      setField("hourly_rate", derivedStr);
    }
  }, [derivedHourlyStr, hourlyRateTouched]);

  async function onSave(target: "details" | "wizard") {
    setErr(null);

    const companyId = company?.id ? String(company.id) : "";
    if (companyErr || !companyId) {
      setErr("No active company selected. Go back and select your company first.");
      return;
    }

    if (!routeId) {
      setErr("Missing employee id.");
      return;
    }

    const first = form.first_name.trim();
    const last = form.last_name.trim();
    const email = form.email.trim();

    if (!first || !last || !email) {
      setErr("First name, last name, and email are required.");
      return;
    }

    if (!form.start_date) {
      setErr("Start date is required.");
      return;
    }

    const ni = cleanNi(form.ni_number);
    if (ni && !isValidNi(ni)) {
      setErr("NI number must be 2 letters, 6 numbers, then 1 letter. Example: AB123456C.");
      return;
    }

    const pf = String(form.pay_frequency || "").trim();
    if (!isAllowedPayFrequency(pf)) {
      setErr("Pay frequency must be weekly, fortnightly, four-weekly, or monthly.");
      return;
    }

    const annual_salary = toNumberOrNull(form.annual_salary);
    let hourly_rate = toNumberOrNull(form.hourly_rate);
    const hours_per_week = toNumberOrNull(form.hours_per_week);

    if (annual_salary !== null && hours_per_week !== null) {
      const derived = computeEquivalentHourlyRate(annual_salary, hours_per_week);
      if (derived !== null) {
        const derivedRounded = rateRound(derived);

        if (!hourlyRateTouched) {
          hourly_rate = derivedRounded;
        } else {
          if (hourly_rate === null || hourly_rate <= 0) {
            hourly_rate = derivedRounded;
          }
        }
      }
    }

    const addressFilled = [
      form.address_line1,
      form.address_line2,
      form.town_city,
      form.county,
      form.postcode,
      form.country,
    ].some((v) => String(v || "").trim() !== "");

    const address = addressFilled
      ? {
          line1: form.address_line1.trim() || null,
          line2: form.address_line2.trim() || null,
          town_city: form.town_city.trim() || null,
          county: form.county.trim() || null,
          postcode: form.postcode.trim() || null,
          country: form.country.trim() || null,
        }
      : null;

    const updateRow: Record<string, any> = {
      employee_number: form.employee_number.trim() || null,

      first_name: first,
      last_name: last,
      email,

      job_title: form.job_title.trim() || null,
      employment_type: form.employment_type.trim() || null,

      start_date: form.start_date || null,
      date_of_birth: form.date_of_birth || null,

      pay_frequency: pf,

      annual_salary: annual_salary !== null ? moneyRound(annual_salary) : null,
      hourly_rate: hourly_rate !== null ? rateRound(hourly_rate) : null,
      hours_per_week: hours_per_week !== null ? hoursRound(hours_per_week) : null,

      ni_number: ni || null,
      national_insurance_number: ni || null,

      address,
    };

    Object.keys(updateRow).forEach((k) => {
      if (updateRow[k] === undefined) delete updateRow[k];
    });

    try {
      setSaving(true);

      const supabase = createClient();

      const idCandidate = String((employee as any)?.id || "").trim();
      const employeeIdCandidate = String((employee as any)?.employee_id || "").trim();

      let matchVal = (isUuid(routeId) ? routeId : "") || idCandidate || employeeIdCandidate || routeId;
      matchVal = String(matchVal || "").trim();

      let matchCol: "id" | "employee_id" = isUuid(matchVal) ? "id" : "employee_id";

      let payload: Record<string, any> = { ...updateRow };

      for (let attempt = 0; attempt < 8; attempt++) {
        const res = await supabase
          .from("employees")
          .update(payload)
          .eq("company_id", companyId)
          .eq(matchCol, matchVal);

        if (!res.error) {
          const nextId = matchVal || routeId;

          if (target === "wizard") {
            router.push(`/dashboard/employees/${nextId}/wizard/starter`);
            return;
          }

          router.push(`/dashboard/employees/${nextId}`);
          return;
        }

        const msg = String(res.error.message || res.error);
        const missing = extractMissingColumn(msg);

        if (missing) {
          if (missing === matchCol) {
            if (matchCol === "employee_id" && isUuid(matchVal)) {
              matchCol = "id";
              continue;
            }
            throw new Error(msg);
          }

          if (Object.prototype.hasOwnProperty.call(payload, missing)) {
            delete payload[missing];
            continue;
          }

          throw new Error(msg);
        }

        throw new Error(msg);
      }

      throw new Error("Save failed after retries.");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  const displayName = useMemo(() => {
    const f = String(employee?.first_name || "").trim();
    const l = String(employee?.last_name || "").trim();
    const full = `${f} ${l}`.trim();
    return full || "Employee";
  }, [employee?.first_name, employee?.last_name]);

  const showOverrideBanner = Boolean(derivedHourlyStr && hourlyRateTouched && hourlyLooksOverridden);

  return (
    <PageTemplate title="Edit employee" currentSection="employees">
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <ActiveCompanyBannerClient
          loading={companyLoading}
          companyName={company?.name ?? null}
          errorText={companyErr}
        />

        <div className="rounded-2xl bg-white/80 px-4 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-lg sm:text-xl text-[#0f3c85] truncate">
                <span className="font-bold">Edit employee</span>
                <span className="text-neutral-700"> - {displayName}</span>
              </div>

              <div className="mt-1 text-sm text-neutral-700">
                {String((employee as any)?.employee_number || "").trim() ? (
                  <>
                    <span className="font-semibold text-neutral-900">
                      Emp {String((employee as any)?.employee_number || "").trim()}
                    </span>
                    <span className="text-neutral-500"> - </span>
                  </>
                ) : null}
                Update employee details and save.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/dashboard/employees/${routeId}`} className={BTN_SECONDARY}>
                Back
              </Link>
              <Link href={`/dashboard/employees/${routeId}/wizard/starter`} className={BTN_SECONDARY}>
                Wizard
              </Link>
              <button onClick={() => onSave("details")} disabled={saving || loading} className={BTN_PRIMARY}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>

        <div className={CARD}>
          {loading ? (
            <div className="text-sm text-neutral-900">Loading...</div>
          ) : err ? (
            <div className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">{err}</div>
          ) : (
            <>
              <div className="text-xl font-semibold text-neutral-900">Core details</div>
              <div className="mt-1 text-sm text-neutral-700">
                This edits the employee record directly. Wizard edits stay available for the wider onboarding steps.
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-neutral-800">Employee number</label>
                  <input
                    value={form.employee_number}
                    onChange={(e) => setField("employee_number", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                    name="employee_number"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-800">Pay frequency</label>
                  <select
                    value={form.pay_frequency}
                    onChange={(e) => setField("pay_frequency", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                    name="pay_frequency"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="four_weekly">Four-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-neutral-800">First name</label>
                  <input
                    value={form.first_name}
                    onChange={(e) => setField("first_name", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                    name="first_name"
                    autoComplete="given-name"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-800">Last name</label>
                  <input
                    value={form.last_name}
                    onChange={(e) => setField("last_name", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                    name="last_name"
                    autoComplete="family-name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-neutral-800">Email</label>
                  <input
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-800">Job title</label>
                  <input
                    value={form.job_title}
                    onChange={(e) => setField("job_title", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                    name="job_title"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-800">Employment type</label>
                  <select
                    value={form.employment_type}
                    onChange={(e) => setField("employment_type", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                    name="employment_type"
                  >
                    <option value="full_time">Full time</option>
                    <option value="part_time">Part time</option>
                    <option value="casual">Casual</option>
                    <option value="apprentice">Apprentice</option>
                    <option value="contractor">Contractor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-neutral-800">Start date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setField("start_date", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                    name="start_date"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-800">Date of birth</label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => setField("date_of_birth", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                    name="date_of_birth"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-800">NI number</label>
                  <input
                    value={form.ni_number}
                    onChange={(e) => setField("ni_number", formatNiInput(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                    name="ni_number"
                    placeholder="AB123456C"
                    maxLength={9}
                    inputMode="text"
                    pattern="[A-Z]{2}[0-9]{6}[A-Z]"
                    title="2 letters, 6 numbers, then 1 letter. Example: AB123456C"
                  />
                  <div className="mt-1 text-xs text-neutral-600">Format: 2 letters, 6 numbers, 1 letter. No spaces.</div>
                </div>

                <div className="md:col-span-2">
                  <div className="rounded-lg border border-neutral-300 bg-white p-4">
                    <div className="text-sm font-semibold text-neutral-900">Pay (optional)</div>

                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label className="block text-sm text-neutral-800">Annual salary (£)</label>
                        <input
                          value={form.annual_salary}
                          onChange={(e) => setField("annual_salary", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                          name="annual_salary"
                          inputMode="decimal"
                          placeholder="30000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-neutral-800">Hourly rate (£)</label>
                        <input
                          value={form.hourly_rate}
                          onChange={(e) => {
                            const v = e.target.value;
                            setField("hourly_rate", v);

                            const trimmed = String(v || "").trim();
                            if (!trimmed) {
                              setHourlyRateTouched(false);
                              return;
                            }

                            if (derivedHourlyNum === null) {
                              setHourlyRateTouched(true);
                              return;
                            }

                            const typedNum = toNumberOrNull(trimmed);
                            if (typedNum === null) {
                              setHourlyRateTouched(true);
                              return;
                            }

                            const isOverride = Math.abs(typedNum - derivedHourlyNum) >= OVERRIDE_DIFF_THRESHOLD;
                            setHourlyRateTouched(isOverride);
                          }}
                          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                          name="hourly_rate"
                          inputMode="decimal"
                          placeholder="12.50"
                        />

                        {derivedHourlyStr ? (
                          <div className="mt-2 flex flex-col gap-2">
                            <div className="text-xs text-neutral-600">
                              Derived equivalent hourly rate:{" "}
                              <span className="font-semibold text-neutral-900">£{derivedHourlyStr}</span> (uses 52.14285714
                              weeks per year)
                            </div>

                            {showOverrideBanner ? (
                              <div
                                className="rounded-lg border px-3 py-2 text-xs font-semibold"
                                style={{
                                  borderColor: "#f59e0b",
                                  backgroundColor: "rgba(245,158,11,0.12)",
                                  color: "#92400e",
                                }}
                              >
                                Hourly rate is overriding the derived value. This is usually wrong for salaried staff.
                                <div className="mt-2 flex gap-2">
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 ring-1 ring-neutral-300 hover:bg-neutral-50"
                                    onClick={() => {
                                      setField("hourly_rate", derivedHourlyStr);
                                      setHourlyRateTouched(false);
                                    }}
                                  >
                                    Use derived rate
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 ring-1 ring-neutral-300 hover:bg-neutral-50"
                                    onClick={() => {
                                      setHourlyRateTouched(true);
                                    }}
                                  >
                                    Keep override
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-neutral-600">
                                If you change hourly rate and it differs from the derived value, WageFlow treats it as a manual override.
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-neutral-600">
                            Auto-derivation needs Annual salary and Hours per week.
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm text-neutral-800">Hours per week</label>
                        <input
                          value={form.hours_per_week}
                          onChange={(e) => setField("hours_per_week", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                          name="hours_per_week"
                          inputMode="decimal"
                          placeholder="37.5"
                        />
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-neutral-600">
                      If you leave these blank, they will be saved as empty (null) values.
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="rounded-lg border border-neutral-300 bg-white p-4">
                    <div className="text-sm font-semibold text-neutral-900">Address (optional)</div>

                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="block text-sm text-neutral-800">Address line 1</label>
                        <input
                          value={form.address_line1}
                          onChange={(e) => setField("address_line1", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                          name="address_line1"
                          autoComplete="address-line1"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm text-neutral-800">Address line 2</label>
                        <input
                          value={form.address_line2}
                          onChange={(e) => setField("address_line2", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                          name="address_line2"
                          autoComplete="address-line2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-neutral-800">Town or city</label>
                        <input
                          value={form.town_city}
                          onChange={(e) => setField("town_city", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                          name="town_city"
                          autoComplete="address-level2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-neutral-800">County</label>
                        <input
                          value={form.county}
                          onChange={(e) => setField("county", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                          name="county"
                          autoComplete="address-level1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-neutral-800">Postcode</label>
                        <input
                          value={form.postcode}
                          onChange={(e) => setField("postcode", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                          name="postcode"
                          autoComplete="postal-code"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-neutral-800">Country</label>
                        <input
                          value={form.country}
                          onChange={(e) => setField("country", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                          name="country"
                          autoComplete="country-name"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 justify-end">
                <button type="button" onClick={() => onSave("wizard")} disabled={saving || loading} className={BTN_SECONDARY}>
                  Save to wizard
                </button>
                <button type="button" onClick={() => onSave("details")} disabled={saving || loading} className={BTN_PRIMARY}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </PageTemplate>
  );
}
