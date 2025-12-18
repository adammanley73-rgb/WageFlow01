// C:\Users\adamm\Projects\wageflow01\components\layout\PageTemplate.tsx

import React, { ReactNode } from "react";
import HeaderBanner from "@/components/ui/HeaderBanner";

type HeaderMode = "default" | "wizard";

type PageTemplateProps = {
title: string;
currentSection?: string;
children: ReactNode;

// Wizard guardrail support (optional)
headerMode?: HeaderMode;
backHref?: string;
backLabel?: string;
};

export default function PageTemplate({
title,
currentSection,
children,
headerMode = "default",
backHref,
backLabel,
}: PageTemplateProps) {
return (
<div className="min-h-screen wf-gradient">
<div className="mx-auto flex min-h-screen max-w-6xl flex-col px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
<HeaderBanner
title={title}
currentSection={currentSection ?? ""}
mode={headerMode}
backHref={backHref}
backLabel={backLabel}
/>

    <main className="mt-4 flex-1 pb-6">{children}</main>
  </div>
</div>


);
}