/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\new\page.tsx

import Link from "next/link";

function Card(props: {
title: string;
description: string;
href?: string;
disabled?: boolean;
disabledNote?: string;
}) {
const body = (
<div className="bg-white rounded-lg shadow p-6 ring-1 ring-neutral-200 h-full flex flex-col">
<h2 className="text-lg font-semibold mb-2 text-neutral-900">
{props.title}
</h2>

  <p className="mb-4 text-neutral-800">{props.description}</p>

  <div className="mt-auto">
    {props.disabled ? (
      <span className="inline-block bg-neutral-300 text-neutral-700 px-4 py-2 rounded cursor-not-allowed select-none">
        {props.disabledNote ?? "Coming soon"}
      </span>
    ) : (
      <Link
        href={props.href || "#"}
        className="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800"
      >
        Open
      </Link>
    )}
  </div>
</div>


);

return body;
}

export default function NewAbsenceHub() {
return (
<div className="rounded-2xl overflow-hidden bg-white/90 ring-1 ring-neutral-200 shadow-sm">
<div className="px-6 py-6 border-b border-neutral-200">
<h1 className="text-center text-3xl font-semibold text-blue-900">
Record New Absence
</h1>
</div>

  <section className="bg-white">
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          title="Sickness"
          description="Uses SSP rules with PIWs, linking, waiting days, and the 28-week cap."
          href="/dashboard/absence/new/sickness"
        />

        <Card
          title="Annual Leave"
          description="Logs and manages paid annual leave, automatically reducing entitlement."
          href="/dashboard/absence/new/annual"
        />

        <Card
          title="Maternity"
          description="Computes SMP AWE and weekly schedule. Saves totals in the record."
          href="/dashboard/absence/new/maternity"
        />

        <Card
          title="Adoption"
          description="Computes SAP weekly schedule when available. Placement date optional."
          href="/dashboard/absence/new/adoption"
        />

        <Card
          title="Paternity"
          description="Computes SPP schedule. Two-week entitlement where eligible."
          href="/dashboard/absence/new/paternity"
        />

        <Card
          title="Shared Parental"
          description="Computes ShPP schedule. Requires eligible partner leave details."
          href="/dashboard/absence/new/shared-parental"
        />

        <Card
          title="Parental Bereavement"
          description="Computes SPBP schedule. One or two weeks depending on circumstance."
          href="/dashboard/absence/new/parental-bereavement"
        />

        <Card
          title="Unpaid Leave"
          description="Records unpaid absence periods and adjusts payroll accordingly."
          disabled
          disabledNote="Not available in this build"
        />
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/dashboard/absence/list"
          className="inline-block bg-blue-900 text-white px-5 py-2 rounded hover:bg-blue-800"
        >
          View saved absences
        </Link>
      </div>
    </div>
  </section>
</div>


);
}