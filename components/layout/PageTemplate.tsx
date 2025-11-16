// C:\Users\adamm\Projects\wageflow01\components\layout\PageTemplate.tsx

import React from "react";
import HeaderBanner from "@/components/ui/HeaderBanner";

type Section =
  | "Dashboard"
  | "Company Selection"
  | "Employees"
  | "Payroll"
  | "Absence"
  | "Reports"
  | "Settings";

type PageTemplateProps = {
  title: Section;
  currentSection: Section;
  children: React.ReactNode;
};

export default function PageTemplate({
  title,
  currentSection,
  children,
}: PageTemplateProps) {
  return (
    // Brand background: logo green → logo blue
    <div className="min-h-screen bg-gradient-to-b from-[#00a651] to-[#0f3c85]">
      {/* Top spacing */}
      <div className="pt-6" />

      {/* Shared container so header and tiles line up perfectly */}
      <div className="mx-auto max-w-6xl px-4 pb-8">
        <HeaderBanner title={title} currentSection={currentSection} />
        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}
