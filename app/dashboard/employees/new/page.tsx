/* C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\new\page.tsx */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageTemplate from "@/components/layout/PageTemplate";

type ActiveCompany = { id?: string; name?: string } | null;

interface FormState {
  employee_number: string;

  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  start_date: string;
  date_of_birth: string;

  employment_type: string;
  apprenticeship_year: string;

  salary: string;
  hourly_rate: string;
  hours_per_week: string;

  ni_number: string;
  pay_frequency: string;

  address_line1: string;
  address_line2: string;
  town_city: string;
  county: string;
  postcode: string;
  country: string;
}

const WEEKS_PER_YEAR = 52.14285714;

type PaySource = "salary" | "hourly" | null;

function cleanNi(raw: string) {
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

function toNumberOrNull(v: string) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function moneyRound(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function fmtMoney(n: number) {
  return moneyRound(n).toFixed(2);
}

function hasAnyText(...vals: string[]) {
  return vals.some((v) => String(v || "").trim() !== "");
}

function parseISODateOrNull(s: string) {
  const t = String(s || "").trim();
  if (!t) return null;
  const d = new Date(t + "T00:00:00");
  return Number.isFinite(d.getTime()) ? d : null;
}

function calcAge(dob: Date, asOf: Date) {
  let age = asOf.getFullYear() - dob.getFullYear();
  const m = asOf.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < dob.getDate())) age--;
  return age;
}

/*
  NMW rates are placeholders until you wire a proper rates table.
*/
type NmwBand = "over21" | "age18to20" | "under18" | "apprentice";
type NmwRates = {
  effectiveFrom: string;
  over21: number;
  age18to20: number;
  under18: number;
  apprentice: number;
};

const NMW_RATES: NmwRates[] = [
  { effectiveFrom: "2025-04-01", over21: 12.21, age18to20: 10.0, under18: 7.55, apprentice: 7.55 },
];

function getApplicableRates(asOf: Date): NmwRates {
  const asOfTs = asOf.getTime();
  const sorted = [...NMW_RATES].sort(
    (a, b) =>
      new Date(b.effectiveFrom + "T00:00:00").getTime() -
      new Date(a.effectiveFrom + "T00:00:00").getTime()
  );
  for (const r of sorted) {
    const ts = new Date(r.effectiveFrom + "T00:00:00").getTime();
    if (asOfTs >= ts) return r;
  }
  return sorted[sorted.length - 1];
}

function getRequiredNmw(
  asOf: Date,
  dobISO: string,
  isApprentice: boolean,
  apprenticeshipYear: number | null
): { band: NmwBand; rate: number; age: number | null; usingEffectiveFrom: string } | null {
  const dob = parseISODateOrNull(dobISO);
  if (!dob) return null;

  const age = calcAge(dob, asOf);
  const rates = getApplicableRates(asOf);

  const firstYearApprentice = isApprentice && apprenticeshipYear === 1;
  const under19Apprentice = isApprentice && age < 19;

  if (firstYearApprentice || under19Apprentice) {
    return { band: "apprentice", rate: rates.apprentice, age, usingEffectiveFrom: rates.effectiveFrom };
  }

  if (age >= 21) return { band: "over21", rate: rates.over21, age, usingEffectiveFrom: rates.effectiveFrom };
  if (age >= 18) return { band: "age18to20", rate: rates.age18to20, age, usingEffectiveFrom: rates.effectiveFrom };
  return { band: "under18", rate: rates.under18, age, usingEffectiveFrom: rates.effectiveFrom };
}

function bandLabel(band: NmwBand) {
  if (band === "over21") return "21+ (NLW)";
  if (band === "age18to20") return "18-20";
  if (band === "under18") return "Under 18";
  return "Apprentice (eligible)";
}

export default function NewEmployeePage() {
  const router = useRouter();

  const [company, setCompany] = useState<ActiveCompany>(null);
  const [companyErr, setCompanyErr] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    employee_number: "",

    first_name: "",
    last_name: "",
    email: "",
    job_title: "",
    start_date: "",
    date_of_birth: "",

    employment_type: "full_time",
    apprenticeship_year: "1",

    salary: "",
    hourly_rate: "",
    hours_per_week: "",

    ni_number: "",
    pay_frequency: "monthly",

    address_line1: "",
    address_line2: "",
    town_city: "",
    county: "",
    postcode: "",
    country: "United Kingdom",
  });

  const [paySource, setPaySource] = useState<PaySource>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [empNoLoading, setEmpNoLoading] = useState(false);
  const [empNoErr, setEmpNoErr] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadActiveCompany() {
      try {
        setCompanyErr(null);
        const res = await fetch("/api/active-company", { cache: "no-store" });
        const data = await res.json().catch(() => ({} as any));
        if (ignore) return;

        if (res.ok) {
          if (data?.ok && data?.company) {
            setCompany(data.company);
            return;
          }
          if (data?.id && data?.name) {
            setCompany(data);
            return;
          }
          if (data?.company_id && data?.company_name) {
            setCompany({ id: data.company_id, name: data.company_name });
            return;
          }

          setCompany(null);
          setCompanyErr("No active company selected.");
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

    async function loadNextEmployeeNumber() {
      if (companyErr || !company?.id) return;

      try {
        setEmpNoErr(null);
        setEmpNoLoading(true);

        const r = await fetch("/api/employees/next-number", { cache: "no-store" });
        const j = await r.json().catch(() => ({} as any));

        if (!alive) return;

        if (!r.ok || !j?.ok) {
          setEmpNoErr(j?.error || "Could not generate employee number.");
          return;
        }

        const nextNo = String(j?.next_employee_number || "").trim();
        if (!nextNo) {
          setEmpNoErr("Could not generate employee number.");
          return;
        }

        setForm((prev) => {
          if (String(prev.employee_number || "").trim()) return prev;
          return { ...prev, employee_number: nextNo };
        });
      } catch {
        if (!alive) return;
        setEmpNoErr("Could not generate employee number.");
      } finally {
        if (!alive) return;
        setEmpNoLoading(false);
      }
    }

    loadNextEmployeeNumber();

    return () => {
      alive = false;
    };
  }, [company?.id, companyErr]);

  const employmentTypeOptions = useMemo(
    () => [
      { value: "full_time", label: "Full time" },
      { value: "part_time", label: "Part time" },
      { value: "casual", label: "Casual" },
      { value: "apprentice", label: "Apprentice" },
      { value: "contractor", label: "Contractor" },
    ],
    []
  );

  const payFrequencyOptions = useMemo(
    () => [
      { value: "weekly", label: "Weekly" },
      { value: "fortnightly", label: "Fortnightly" },
      { value: "four_weekly", label: "Four-weekly" },
      { value: "monthly", label: "Monthly" },
    ],
    []
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    const hours = toNumberOrNull(form.hours_per_week);
    if (!hours || hours <= 0) return;

    const salary = toNumberOrNull(form.salary);
    const hourly = toNumberOrNull(form.hourly_rate);

    if (paySource === "salary") {
      if (salary !== null && salary > 0) {
        const derivedHourly = salary / (hours * WEEKS_PER_YEAR);
        const next = fmtMoney(derivedHourly);
        if (String(form.hourly_rate || "").trim() !== next) {
          setForm((prev) => ({ ...prev, hourly_rate: next }));
        }
      }
      return;
    }

    if (paySource === "hourly") {
      if (hourly !== null && hourly > 0) {
        const derivedSalary = hourly * hours * WEEKS_PER_YEAR;
        const next = fmtMoney(derivedSalary);
        if (String(form.salary || "").trim() !== next) {
          setForm((prev) => ({ ...prev, salary: next }));
        }
      }
      return;
    }

    if (salary !== null && salary > 0 && (!form.hourly_rate || String(form.hourly_rate).trim() === "")) {
      const derivedHourly = salary / (hours * WEEKS_PER_YEAR);
      const next = fmtMoney(derivedHourly);
      setForm((prev) => ({ ...prev, hourly_rate: next }));
      return;
    }

    if (hourly !== null && hourly > 0 && (!form.salary || String(form.salary).trim() === "")) {
      const derivedSalary = hourly * hours * WEEKS_PER_YEAR;
      const next = fmtMoney(derivedSalary);
      setForm((prev) => ({ ...prev, salary: next }));
    }
  }, [form.salary, form.hourly_rate, form.hours_per_week, paySource]);

  const nmw = useMemo(() => {
    const asOf = parseISODateOrNull(form.start_date) || new Date();
    const isApprentice = form.employment_type === "apprentice";
    const appYearNum = isApprentice ? toNumberOrNull(form.apprenticeship_year) : null;

    const required = getRequiredNmw(asOf, form.date_of_birth, isApprentice, appYearNum);
    const payHourly = toNumberOrNull(form.hourly_rate);

    if (!required || payHourly === null) {
      return {
        ready: false,
        message: "NMW check needs Date of birth and an hourly figure (hourly rate or salary plus hours).",
        requiredRate: null as number | null,
        payHourly: payHourly,
        band: null as NmwBand | null,
        age: null as number | null,
        effectiveFrom: null as string | null,
        below: null as boolean | null,
      };
    }

    const below = payHourly + 1e-9 < required.rate;

    return {
      ready: true,
      message: below ? "Below NMW for this worker." : "Meets or exceeds NMW.",
      requiredRate: required.rate,
      payHourly: moneyRound(payHourly),
      band: required.band,
      age: required.age,
      effectiveFrom: required.usingEffectiveFrom,
      below,
    };
  }, [form.start_date, form.date_of_birth, form.employment_type, form.apprenticeship_year, form.hourly_rate]);

  const niPreview = useMemo(() => {
    const formatted = formatNiInput(form.ni_number || "");
    const cleaned = cleanNi(formatted);
    const hasAny = String(form.ni_number || "").trim() !== "";
    const complete = cleaned.length === 9;
    const valid = !hasAny ? true : complete ? isValidNi(cleaned) : true;
    return { cleaned, hasAny, complete, valid };
  }, [form.ni_number]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (companyErr || !company?.id) {
      setErr("No active company selected. Go back to Dashboard and select your company first.");
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

    const hours = toNumberOrNull(form.hours_per_week);
    const salary = toNumberOrNull(form.salary);
    const hourly = toNumberOrNull(form.hourly_rate);

    const hasAnyPayInput =
      String(form.salary || "").trim() !== "" ||
      String(form.hourly_rate || "").trim() !== "" ||
      String(form.hours_per_week || "").trim() !== "";

    if (hasAnyPayInput) {
      if (!hours || hours <= 0) {
        setErr("Enter hours per week so pay can be validated.");
        return;
      }
      if ((salary === null || salary <= 0) && (hourly === null || hourly <= 0)) {
        setErr("Enter annual salary or hourly rate.");
        return;
      }
    }

    const addressFilled = hasAnyText(
      form.address_line1,
      form.address_line2,
      form.town_city,
      form.county,
      form.postcode,
      form.country
    );

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

    const isApprentice = form.employment_type === "apprentice";
    const apprenticeshipYear = isApprentice ? toNumberOrNull(form.apprenticeship_year) : null;

    const payload: any = {
      employee_number: String(form.employee_number || "").trim() || null,

      first_name: first,
      last_name: last,
      email,
      job_title: form.job_title.trim() || null,
      start_date: form.start_date,
      date_of_birth: form.date_of_birth || null,

      employment_type: form.employment_type,
      pay_frequency: form.pay_frequency,

      ni_number: ni || null,

      annual_salary: salary !== null ? moneyRound(salary) : null,
      hourly_rate: hourly !== null ? moneyRound(hourly) : null,
      hours_per_week: hours !== null ? moneyRound(hours) : null,

      address,

      is_apprentice: isApprentice,
      apprenticeship_year: apprenticeshipYear,
    };

    setSaving(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data?.ok) {
        setErr(data?.error || "Create employee failed.");
        setSaving(false);
        return;
      }

      const employeeId =
        data?.employee?.id ||
        data?.employee?.employee_id ||
        data?.employee_id ||
        data?.id ||
        data?.employeeId;

      if (!employeeId) {
        setErr("Employee created but no id returned by API.");
        setSaving(false);
        return;
      }

      router.push(`/dashboard/employees/${employeeId}/wizard/starter`);
    } catch {
      setErr("Create employee failed. Network or server error.");
      setSaving(false);
    }
  }

  const PT: any = PageTemplate;

  const BTN_PRIMARY =
    "w-44 inline-flex items-center justify-center rounded-lg bg-[#0f3c85] px-5 py-2 text-white font-semibold disabled:opacity-60 hover:bg-[#0c2f68]";
  const BTN_SECONDARY =
    "w-44 inline-flex items-center justify-center rounded-lg border border-neutral-400 bg-white px-5 py-2 text-neutral-900 font-semibold hover:bg-neutral-50";

  return (
    <PT currentSection="employees" title="New employee">
      <div className="mx-auto w-full max-w-none">
        <div className="rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6">
          <div className="mb-4">
            <div className="text-sm text-neutral-700">
              Active company:{" "}
              <span className="font-semibold text-neutral-900">
                {company?.name || (companyErr ? "None selected" : "Loading...")}
              </span>
            </div>
            {companyErr ? <div className="mt-2 text-sm text-red-700">{companyErr}</div> : null}
          </div>

          <h1 className="text-2xl font-semibold text-neutral-900">Create employee</h1>
          <p className="mt-1 text-sm text-neutral-700">
            Create the employee record, then you will be redirected into the wizard.
          </p>

          {err ? <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{err}</div> : null}

          <form onSubmit={onSubmit} className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-neutral-800">Employee number</label>
                <input
                  value={form.employee_number}
                  onChange={(e) => setField("employee_number", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                  name="employee_number"
                  placeholder={empNoLoading ? "Generating..." : "Auto-generated"}
                />
                <div className="mt-1 text-xs text-neutral-600">
                  {empNoErr ? empNoErr : "Auto-filled. You can change it if needed."}
                </div>
              </div>

              <div>
                <label className="block text-sm text-neutral-800">Pay frequency</label>
                <select
                  value={form.pay_frequency}
                  onChange={(e) => setField("pay_frequency", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                  name="pay_frequency"
                >
                  {payFrequencyOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-neutral-800">First name</label>
                <input
                  value={form.first_name}
                  onChange={(e) => setField("first_name", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                  autoComplete="given-name"
                  name="first_name"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-800">Last name</label>
                <input
                  value={form.last_name}
                  onChange={(e) => setField("last_name", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                  autoComplete="family-name"
                  name="last_name"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-neutral-800">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                  autoComplete="email"
                  name="email"
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
                <label className="block text-sm text-neutral-800">Employment type</label>
                <select
                  value={form.employment_type}
                  onChange={(e) => {
                    const v = e.target.value;
                    setField("employment_type", v);
                    if (v !== "apprentice") setField("apprenticeship_year", "1");
                  }}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                  name="employment_type"
                >
                  {employmentTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {form.employment_type === "apprentice" ? (
                <div>
                  <label className="block text-sm text-neutral-800">Apprenticeship year</label>
                  <select
                    value={form.apprenticeship_year}
                    onChange={(e) => setField("apprenticeship_year", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                    name="apprenticeship_year"
                  >
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>
              ) : (
                <div />
              )}

              <div>
                <label className="block text-sm text-neutral-800">NI number</label>
                <input
                  value={form.ni_number}
                  onChange={(e) => setField("ni_number", formatNiInput(e.target.value))}
                  className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-neutral-900 ${
                    !niPreview.valid ? "border-red-500" : "border-neutral-300"
                  }`}
                  name="ni_number"
                  placeholder="AB123456C"
                  maxLength={9}
                  inputMode="text"
                  pattern="[A-Z]{2}[0-9]{6}[A-Z]"
                  title="2 letters, 6 numbers, then 1 letter. Example: AB123456C"
                />
                <div className={`mt-1 text-xs ${!niPreview.valid ? "text-red-700" : "text-neutral-600"}`}>
                  {!niPreview.hasAny
                    ? "Optional. If provided, must be AB123456C format."
                    : !niPreview.complete
                      ? `Keep going. Normalised: ${niPreview.cleaned}`
                      : niPreview.valid
                        ? `Normalised: ${niPreview.cleaned}`
                        : "Invalid format. Must be 2 letters + 6 digits + 1 letter. Example AB123456C."}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="rounded-lg border border-neutral-300 bg-white p-4">
                  <div className="text-sm font-semibold text-neutral-900">Address</div>

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

              <div className="md:col-span-2">
                <div className="rounded-lg border border-neutral-300 bg-white p-4">
                  <div className="text-sm font-semibold text-neutral-900">Pay</div>

                  <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm text-neutral-800">Annual salary (£)</label>
                      <input
                        value={form.salary}
                        onChange={(e) => {
                          setPaySource("salary");
                          setField("salary", e.target.value);
                        }}
                        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                        name="salary"
                        inputMode="decimal"
                        placeholder="30000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-800">Hourly rate (£)</label>
                      <input
                        value={form.hourly_rate}
                        onChange={(e) => {
                          setPaySource("hourly");
                          setField("hourly_rate", e.target.value);
                        }}
                        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
                        name="hourly_rate"
                        inputMode="decimal"
                        placeholder="12.50"
                      />
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

                  <div className="mt-4 rounded-lg border border-neutral-300 bg-neutral-50 p-3">
                    <div className="text-sm font-semibold text-neutral-900">NMW check</div>
                    <div className={`mt-1 text-sm ${nmw.ready && nmw.below ? "text-red-700" : "text-neutral-700"}`}>
                      {nmw.message}
                    </div>

                    {nmw.ready ? (
                      <div className="mt-2 text-sm text-neutral-800">
                        Worker age: <span className="font-semibold">{nmw.age}</span>. Band:{" "}
                        <span className="font-semibold">{bandLabel(nmw.band as NmwBand)}</span>. Required:{" "}
                        <span className="font-semibold">£{(nmw.requiredRate as number).toLocaleString("en-GB")}</span>{" "}
                        per hour. Your hourly figure:{" "}
                        <span className="font-semibold">£{(nmw.payHourly as number).toLocaleString("en-GB")}</span>.
                        <div className="mt-1 text-xs text-neutral-600">
                          Rates applied from {nmw.effectiveFrom}. Final compliance is validated in payroll runs.
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-neutral-600">
                        Tip: enter Date of birth and Hours per week, then enter Annual salary or Hourly rate.
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-neutral-600">
                    Uses {WEEKS_PER_YEAR} weeks per year for conversions.
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-1 flex flex-wrap gap-3">
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Saving..." : "Create employee"}
              </button>

              <button
                type="button"
                className={BTN_SECONDARY}
                onClick={() => router.push("/dashboard/employees")}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </PT>
  );
}
