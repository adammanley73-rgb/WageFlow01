import React from "react";
import { headers } from "next/headers";
import PageTemplate from "@/components/layout/PageTemplate";
type ActiveCompany = {
id: string | null;
name: string | null;
};
async function getActiveCompany(): Promise<ActiveCompany> {
const h = headers();
const cookieHeader = h.get("cookie") ?? "";
const parts = cookieHeader.split(";").map((p) => p.trim());
let id: string | null = null;
let name: string | null = null;
for (const p of parts) {
if (p.startsWith("active_company_id=")) {
id = decodeURIComponent(p.slice("active_company_id=".length));
}
if (p.startsWith("active_company_name=")) {
name = decodeURIComponent(p.slice("active_company_name=".length));
}
}
return { id, name };
}
export default async function DashboardPage() {
const active = await getActiveCompany();
const tileBase =
"rounded-2xl bg-neutral-300 ring-1 ring-neutral-400 flex flex-col items-center justify-center h-[140px] transition-transform duration-150 hover:-translate-y-1 hover:shadow-lg";
return (
<PageTemplate title="Dashboard" currentSection="Dashboard">
<div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden mb-6">
{/* company stripe */}
<div className="px-6 py-3 bg-white border-b-2 border-neutral-200 flex items-baseline gap-3">
<span className="text-xs uppercase tracking-wide text-neutral-500 leading-none">
Company
</span>
<span className="text-lg font-semibold text-[#0f3c85] leading-none">
{active.name ?? "No active company selected"}
</span>
</div>
    {/* Top 3 tiles */}
    <div className="grid gap-4 md:grid-cols-3 px-6 py-4 bg-neutral-100">
      <div className={tileBase}>
        <div className="text-sm font-semibold text-neutral-900 mb-2">
          Employees
        </div>
        <div
          className="text-3xl font-bold text-neutral-950"
          style={{
            fontFamily:
              "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
          }}
        >
          0
        </div>
        <div className="mt-2 text-xs text-neutral-700">
          Total employees will show here.
        </div>
      </div>

      <div className={tileBase}>
        <div className="text-sm font-semibold text-neutral-900 mb-2">
          Payroll
        </div>
        <div
          className="text-3xl font-bold text-neutral-950"
          style={{
            fontFamily:
              "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
          }}
        >
          0
        </div>
        <div className="mt-2 text-xs text-neutral-700">
          This period payroll summary.
        </div>
      </div>

      <div className={tileBase}>
        <div className="text-sm font-semibold text-neutral-900 mb-2">
          Absence
        </div>
        <div
          className="text-3xl font-bold text-neutral-950"
          style={{
            fontFamily:
              "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
          }}
        >
          0
        </div>
        <div className="mt-2 text-xs text-neutral-700">
          Absence and leave info.
        </div>
      </div>
    </div>

    {/* Wizard row */}
    <div className="grid gap-4 md:grid-cols-4 px-6 pb-4 bg-neutral-100">
      <div className={tileBase}>
        <div className="text-sm font-semibold text-neutral-900 mb-1">
          New Employee Wizard
        </div>
        <div className="h-[2px] w-10 bg-neutral-800 rounded-full" />
        <div className="mt-2 text-[11px] text-neutral-700 text-center px-4">
          Create starter, collect bank and RTI info.
        </div>
      </div>

      <div className={tileBase}>
        <div className="text-sm font-semibold text-neutral-900 mb-1">
          Leaver Wizard
        </div>
        <div className="h-[2px] w-10 bg-neutral-800 rounded-full" />
        <div className="mt-2 text-[11px] text-neutral-700 text-center px-4">
          Mark employee as leaver and close payroll.
        </div>
      </div>

      <div className={tileBase}>
        <div className="text-sm font-semibold text-neutral-900 mb-1">
          New Payroll Run Wizard
        </div>
        <div className="h-[2px] w-10 bg-neutral-800 rounded-full" />
        <div className="mt-2 text-[11px] text-neutral-700 text-center px-4">
          Start run, validate, approve and submit RTI.
        </div>
      </div>

      <div className={tileBase}>
        <div className="text-sm font-semibold text-neutral-900 mb-1">
          Record New Absence Wizard
        </div>
        <div className="h-[2px] w-10 bg-neutral-800 rounded-full" />
        <div className="mt-2 text-[11px] text-neutral-700 text-center px-4">
          Add sickness/leave and feed payroll.
        </div>
      </div>
    </div>
  </div>
</PageTemplate>

);
}