/* app/dashboard/page.tsx */
import PageTemplate from "@/components/layout/PageTemplate";

export default function DashboardPage() {
  return (
    <PageTemplate
      title="Dashboard"
      currentSection="Dashboard"
      stats={[
        { label: "Employees", value: 0 },
        { label: "Payroll Runs", value: 0 },
        { label: "Pending Tasks", value: 0 },
        { label: "Notices", value: 0 }
      ]}
      statCols={4}
      actions={[
        { title: "New Employee Wizard", description: "Create a new employee record", href: "/dashboard/employees/new" },
        { title: "View Employees", description: "Browse and edit your employee list", href: "/dashboard/employees" },
        { title: "Run Payroll", description: "Start a weekly or monthly run", href: "/dashboard/payroll" },
        { title: "Record Absence", description: "Log sickness or annual leave", href: "/dashboard/absence" }
      ]}
      actionCols={4}
    />
  );
}
