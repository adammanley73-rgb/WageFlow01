// C:\Users\adamm\Projects\wageflow01\app\dashboard\payroll\page.tsx

import PageTemplate from "@/components/layout/PageTemplate";
import ActiveCompanyBanner from "@/components/ui/ActiveCompanyBanner";
import PayrollRunsTable from "./PayrollRunsTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PayrollPage() {
  return (
    <PageTemplate title="Payroll" currentSection="Payroll">
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <ActiveCompanyBanner />

        <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
            <div className="text-sm font-semibold text-neutral-900">Payroll runs</div>
            <div className="text-xs text-neutral-700">
              Latest payroll runs for the active company. Most recent period at the top.
            </div>
          </div>

          <PayrollRunsTable />
        </div>
      </div>
    </PageTemplate>
  );
}
