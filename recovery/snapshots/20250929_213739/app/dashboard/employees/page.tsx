/* app/dashboard/employees/page.tsx */
import PageTemplate from "@/components/layout/PageTemplate";
import EmployeesTable from "@/components/tables/EmployeesTable";

export default function EmployeesPage() {
  return (
    <PageTemplate
      title="Employees"
      currentSection="Employees"
      stats={[
        { label: "Active employees", value: 42 },
        { label: "New starters", value: 3 },
        { label: "Leavers", value: 1 }
      ]}
      statCols={3}
      actions={[]}
    >
      <div className="mt-2">
        <EmployeesTable />
        <div className="mt-4 flex justify-end">
          <a
            href="/dashboard/employees/new"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#1e40af] px-4 text-white text-sm hover:-translate-y-0.5 transition-transform"
          >
            Create employee
          </a>
        </div>
      </div>
    </PageTemplate>
  );
}
