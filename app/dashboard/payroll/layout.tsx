/* app/dashboard/payroll/layout.tsx */
import PageTemplate from "@/components/layout/PageTemplate";
import { ReactNode } from "react";

export default function PayrollSectionLayout({ children }: { children: ReactNode }) {
  return (
    <PageTemplate title="Payroll" currentSection="Payroll">
      {children}
    </PageTemplate>
  );
}
