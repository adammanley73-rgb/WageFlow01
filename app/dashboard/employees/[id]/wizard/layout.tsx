// C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\[id]\wizard\layout.tsx

import React from "react";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Force dynamic rendering to avoid caching oddities in wizard flows.
  headers();

  // Pages under this layout already render PageTemplate with headerMode="wizard".
  // If we wrap PageTemplate here as well, you risk double headers and conflicting back links.
  return <>{children}</>;
}
