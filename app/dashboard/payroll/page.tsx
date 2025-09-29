/* app/dashboard/payroll/page.tsx */
import PageTemplate from "@/components/layout/PageTemplate";

export default function PayrollPage() {
  return (
    <PageTemplate
      title="Payroll"
      currentSection="Payroll"
      stats={[
        { label: "Open runs", value: 2 },
        { label: "Completed", value: 18 },
        { label: "Approved", value: 0 },
        { label: "RTI submitted", value: 0 }
      ]}
      statCols={4}
      actions={[
        { title: "New Payroll Wizard", description: "Start a new payroll run", href: "/dashboard/payroll/new" },
        { title: "View Runs", description: "Browse all payroll runs", href: "/dashboard/payroll/runs" }
      ]}
      actionCols={2}
    />
  );
}
