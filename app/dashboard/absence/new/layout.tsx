/* C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\new\layout.tsx */
import { ReactNode } from "react";

export default function AbsenceNewLayout({
  children,
}: {
  children: ReactNode;
}) {
  // This layout must NOT wrap with PageTemplate/HeaderBanner.
  // The page owns the gold-standard shell.
  return <>{children}</>;
}
