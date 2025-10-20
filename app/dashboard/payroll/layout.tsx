import { ReactNode } from "react";
import PageTemplate from "@/components/layout/PageTemplate";

export default function PayrollSectionLayout({ children }: { children: ReactNode }) {
  return (
    <PageTemplate>
      {children}
    </PageTemplate>
  );
}
