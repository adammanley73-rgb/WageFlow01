/* C:\Users\adamm\Projects\wageflow01\components\layout\PageTemplate.tsx */
import { ReactNode } from "react";
import HeaderBanner from "@/components/ui/HeaderBanner";

type NavItem = {
  key: string;
  label: string;
  href: string;
};

interface PageTemplateProps {
  title: string;
  currentSection: string;
  children: ReactNode;
}

/**
 * PageTemplate
 * - Vertical background gradient from logo green (top) to logo blue (bottom).
 * - Standardised chips, including Company Selection.
 */
export default function PageTemplate({
  title,
  currentSection,
  children,
}: PageTemplateProps) {
  const navChips: NavItem[] = [
    { key: "dashboard", label: "Dashboard", href: "/dashboard" },
    { key: "employees", label: "Employees", href: "/dashboard/employees" },
    { key: "payroll", label: "Payroll", href: "/dashboard/payroll" },
    { key: "absence", label: "Absence", href: "/dashboard/absence" },
    { key: "reports", label: "Reports", href: "/dashboard/reports" },
    { key: "settings", label: "Settings", href: "/dashboard/settings" },
    { key: "companies", label: "Company Selection", href: "/dashboard/companies" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00C853] to-[#2962FF]">
      <HeaderBanner title={title} currentSection={currentSection} navChips={navChips} />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
