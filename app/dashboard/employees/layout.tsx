/* app/dashboard/employees/layout.tsx */
import PageTemplate from "@/components/layout/PageTemplate";
import { ReactNode } from "react";

export default function EmployeesSectionLayout({ children }: { children: ReactNode }) {
  return (
    <PageTemplate title="Employees" currentSection="Employees">
      {children}
    </PageTemplate>
  );
}
