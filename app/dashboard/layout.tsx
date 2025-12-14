// C:\Users\adamm\Projects\wageflow01\app\dashboard\layout.tsx
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // Prevents any default header or nav wrapping pages like the payslip
  return <>{children}</>;
}
