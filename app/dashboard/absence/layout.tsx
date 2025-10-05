/* app/dashboard/absence/layout.tsx */
import PageTemplate from "@/components/layout/PageTemplate";
import { ReactNode } from "react";

export default function AbsenceSectionLayout({ children }: { children: ReactNode }) {
  return (
    <PageTemplate title="Absence" currentSection="Absence">
      {children}
    </PageTemplate>
  );
}
