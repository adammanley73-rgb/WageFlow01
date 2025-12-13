/* app/dashboard/absence/new/layout.tsx */
import { ReactNode } from "react";

export default function AbsenceNewLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Let the /new/page.tsx handle its own gradient and layout.
  // No extra white card or max-width here.
  return <>{children}</>;
}
