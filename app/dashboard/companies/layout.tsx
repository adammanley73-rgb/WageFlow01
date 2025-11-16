/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\companies\layout.tsx

import type { ReactNode } from "react";

export default function CompaniesLayout({ children }: { children: ReactNode }) {
  // Let the parent dashboard layout + PageTemplate handle
  // the gradient, header banner, and nav chips.
  // This layout now just passes content through.
  return <>{children}</>;
}
