/* @ts-nocheck */
/* C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\new\page.tsx */

import Link from "next/link";
import PageTemplate, { ActionTile } from "@/components/ui/PageTemplate";

const CARD =
  "w-full rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6";

const PRIMARY_BTN =
  "inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-6 py-2 text-sm font-semibold text-white hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-white/60";

export default function NewAbsenceHub() {
  return (
    <PageTemplate title="Absence" currentSection="absence">
      <div className={CARD}>
        {/* Top CTA: full width on mobile, normal on desktop */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Link
            href="/dashboard/absence/list"
            className={`${PRIMARY_BTN} w-full sm:w-auto`}
          >
            View saved absences
          </Link>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-blue-900">
            Record new absence
          </h2>
          <p className="mt-1 text-sm text-neutral-800">
            Choose the absence type you want to record.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ActionTile
            title="Sickness"
            href="/dashboard/absence/new/sickness"
            description="SSP rules with PIWs, linking, waiting days, and the 28-week cap."
          />
          <ActionTile
            title="Maternity"
            href="/dashboard/absence/new/maternity"
            description="SMP AWE and weekly schedule. Saves totals in the record."
          />
          <ActionTile
            title="Adoption"
            href="/dashboard/absence/new/adoption"
            description="SAP weekly schedule when available. Placement date optional."
          />
          <ActionTile
            title="Paternity"
            href="/dashboard/absence/new/paternity"
            description="SPP schedule. Two-week entitlement where eligible."
          />
          <ActionTile
            title="Shared Parental"
            href="/dashboard/absence/new/shared-parental"
            description="ShPP schedule. Requires eligible partner leave details."
          />
          <ActionTile
            title="Parental Bereavement"
            href="/dashboard/absence/new/parental-bereavement"
            description="SPBP schedule. One or two weeks depending on circumstances."
          />
          <ActionTile
            title="Annual Leave"
            href="/dashboard/absence/new/annual"
            description="Record annual leave and reduce entitlement automatically."
          />
          <ActionTile
            title="Requests"
            href="/dashboard/absence/requests"
            description="View and manage incoming absence requests."
          />
        </div>
      </div>
    </PageTemplate>
  );
}
