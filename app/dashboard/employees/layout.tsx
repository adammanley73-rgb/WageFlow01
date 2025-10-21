import { ReactNode } from "react";
import PageTemplate from "@/components/layout/PageTemplate";

export default function EmployeesSectionLayout({ children }: { children: ReactNode }) {
  return (
    <PageTemplate>
      {children}
    </PageTemplate>
  );
}
