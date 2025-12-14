/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\components\layout\PageTemplate.tsx

import React, { ReactNode } from "react";
import HeaderBanner from "@/components/ui/HeaderBanner";

type PageTemplateProps = {
  title: string;
  currentSection?: string;
  children: ReactNode;
};

export default function PageTemplate({
  title,
  currentSection,
  children,
}: PageTemplateProps) {
  return (
    <div className="min-h-screen wf-gradient">
      {/* Single, shared wide container for ALL dashboard pages */}
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
        {/* Header banner aligned to same width as content */}
        <HeaderBanner title={title} currentSection={currentSection ?? ""} />

        {/* Main page content, fills the same container width */}
        <main className="mt-4 flex-1 pb-6">{children}</main>
      </div>
    </div>
  );
}
