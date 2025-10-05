/* app/dashboard/reports/layout.tsx */
import PageTemplate from "@/components/layout/PageTemplate";
import { ReactNode } from "react";

export default function ReportsSectionLayout({ children }: { children: ReactNode }) {
  return (
    <PageTemplate title="Reports" currentSection="Reports">
      {children}
    </PageTemplate>
  );
}
