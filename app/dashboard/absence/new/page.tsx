// C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\new\page.tsx
/* @ts-nocheck */

import Link from "next/link";
import PageTemplate from "@/components/layout/PageTemplate";

type HubCardProps = {
  title: string;
  description: string;
  href?: string;
  disabled?: boolean;
  disabledNote?: string;
};

function HubCard({
  title,
  description,
  href,
  disabled,
  disabledNote,
}: HubCardProps) {
  const base =
    "rounded-2xl bg-white/95 shadow-sm ring-1 ring-neutral-300 p-5 flex flex-col text-left";
  const titleCls = "text-base font-bold text-neutral-900";
  const descCls = "mt-2 text-sm text-neutral-700";
  const footerCls = "mt-4";

  if (disabled) {
    return (
      <div className={base + " opacity-80"}>
        <div className={titleCls}>{title}</div>
        <div className={descCls}>{description}</div>
        <div className={footerCls}>
          <span className="inline-flex items-center rounded-full bg-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-300">
            {disabledNote ?? "Not available"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href ?? "#"}
      className={
        base +
        " transition-transform hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
      }
      aria-label={"Open " + title}
    >
      <div className={titleCls}>{title}</div>
      <div className={descCls}>{description}</div>
      <div className={footerCls}>
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: "var(--wf-blue)" }}
        >
          Open
        </span>
      </div>
    </Link>
  );
}

export default function NewAbsenceHubPage() {
  return (
    <PageTemplate title="New absence" currentSection="absence">
      <div className="rounded-2xl bg-white/90 ring-1 ring-neutral-300 shadow-sm p-6">
        <div className="text-sm text-neutral-700">
          Pick the absence type you want to record.
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <HubCard
            title="Sickness"
            description="SSP wizard with PIWs, linking, waiting days, and the 28-week cap."
            href="/dashboard/absence/new/sickness"
          />

          <HubCard
            title="Annual leave"
            description="Record paid annual leave. This feeds holiday pay calculations for the relevant pay period."
            href="/dashboard/absence/new/annual"
          />

          <HubCard
            title="Maternity"
            description="SMP wizard with AWE calculator and weekly schedule."
            href="/dashboard/absence/new/maternity"
          />

          <HubCard
            title="Adoption"
            description="SAP wizard with weekly schedule."
            href="/dashboard/absence/new/adoption"
          />

          <HubCard
            title="Paternity"
            description="SPP wizard with eligibility and schedule."
            href="/dashboard/absence/new/paternity"
          />

          <HubCard
            title="Shared parental"
            description="ShPP wizard with shared leave details and schedule."
            href="/dashboard/absence/new/shared-parental"
          />

          <HubCard
            title="Parental bereavement"
            description="SPBP wizard placeholder. Still needs full restore."
            href="/dashboard/absence/new/parental-bereavement"
          />

          <HubCard
            title="Unpaid leave"
            description="Route not implemented yet."
            disabled
            disabledNote="Not built yet"
          />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Link
            href="/dashboard/absence/list"
            className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--wf-blue)" }}
          >
            View saved absences
          </Link>
        </div>
      </div>
    </PageTemplate>
  );
}
