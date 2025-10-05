/* app/dashboard/settings/layout.tsx */
import PageTemplate from "@/components/layout/PageTemplate";
import { ReactNode } from "react";

export default function SettingsSectionLayout({ children }: { children: ReactNode }) {
  return (
    <PageTemplate title="Settings" currentSection="Settings">
      {children}
    </PageTemplate>
  );
}
