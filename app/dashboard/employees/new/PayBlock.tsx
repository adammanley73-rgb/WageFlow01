// app/dashboard/employees/new/PayBlock.tsx
"use client";

import { useEffect, useState } from "react";
import { Section, Field } from "./sharedFields";

const WEEKS_PER_YEAR = 52.1429; // keep this consistent everywhere

export default function PayBlock() {
  const [payType, setPayType] = useState<"Salary" | "Hourly">("Salary");
  const [hours, setHours] = useState<number>(37.5);
  const [salary, setSalary] = useState<string>("0");
  const [hourly, setHourly] = useState<string>("0");
  const [taxCode, setTaxCode] = useState<string>("1257L");

  // Recompute hourly when in Salary mode
  useEffect(() => {
    if (payType !== "Salary") return;
    const s = Number(salary) || 0;
    const h = Number(hours) || 0;
    const rate = h > 0 ? s / (WEEKS_PER_YEAR * h) : 0;
    setHourly(rate ? rate.toFixed(2) : "0");
  }, [salary, hours, payType]);

  // Recompute salary when in Hourly mode
  useEffect(() => {
    if (payType !== "Hourly") return;
    const r = Number(hourly) || 0;
    const h = Number(hours) || 0;
    const s = r * WEEKS_PER_YEAR * h;
    setSalary(s ? s.toFixed(2) : "0");
  }, [hourly, hours, payType]);

  return (
    <Section title="Pay">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Pay type" name="pay_type">
          <select
            id="pay_type"
            name="pay_type"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
            value={payType}
            onChange={(e) => setPayType(e.target.value as "Salary" | "Hourly")}
          >
            <option>Salary</option>
            <option>Hourly</option>
          </select>
        </Field>

        <Field label="Hours per week" name="hours_per_week">
          <input
            id="hours_per_week"
            name="hours_per_week"
            type="number"
            step="0.1"
            placeholder="37.5"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />
        </Field>

        <Field label="Annual salary (£)" name="annual_salary">
          <input
            id="annual_salary"
            name="annual_salary"
            type="number"
            step="0.01"
            placeholder="52000"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            disabled={payType === "Hourly"}
          />
          <p className="mt-1 text-xs text-neutral-500">
            {payType === "Hourly"
              ? "Auto when Hourly is used"
              : "Editable in Salary mode"}
          </p>
        </Field>

        <Field label="Hourly rate (£)" name="hourly_rate">
          <input
            id="hourly_rate"
            name="hourly_rate"
            type="number"
            step="0.01"
            placeholder="auto"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
            value={hourly}
            onChange={(e) => setHourly(e.target.value)}
            disabled={payType === "Salary"}
          />
          <p className="mt-1 text-xs text-neutral-500">
            {payType === "Salary"
              ? "Auto when Salary is used"
              : "Editable in Hourly mode"}
          </p>
        </Field>

        <Field label="Tax code" name="tax_code">
          <input
            id="tax_code"
            name="tax_code"
            type="text"
            placeholder="1257L"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
            value={taxCode}
            onChange={(e) => setTaxCode(e.target.value.toUpperCase())}
          />
        </Field>
      </div>
    </Section>
  );
}
