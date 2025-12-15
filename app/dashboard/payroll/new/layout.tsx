// C:\Users\adamm\Projects\wageflow01\app\dashboard\payroll\new\layout.tsx
import React, { ReactNode } from "react";
import PageTemplate from "@/components/layout/PageTemplate";
import ActiveCompanyBanner from "@/components/ui/ActiveCompanyBanner";

export default function PayrollNewLayout({ children }: { children: ReactNode }) {
  return (
    <PageTemplate title="Payroll" currentSection="Payroll">
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <ActiveCompanyBanner />

        <div className="flex-1 min-h-0">
          <div className="mx-auto w-full max-w-4xl">
            <div className="rounded-2xl bg-white ring-1 ring-neutral-300 p-6 sm:p-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
