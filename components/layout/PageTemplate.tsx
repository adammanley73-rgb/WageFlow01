/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\components\layout\PageTemplate.tsx

import React from "react";
import HeaderBanner from "@/components/ui/HeaderBanner";

type PageTemplateProps = {
  title: string;
  currentSection: string;
  children: React.ReactNode;
};

export default function PageTemplate({
  title,
  currentSection,
  children,
}: PageTemplateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#10b981] via-[#06b6d4] to-[#0f3c85]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-4 sm:py-6">
        <HeaderBanner title={title} currentSection={currentSection} />
        <main className="mt-4 sm:mt-6 flex-1 flex flex-col gap-4">
          {children}
        </main>
      </div>
    </div>
  );
}
