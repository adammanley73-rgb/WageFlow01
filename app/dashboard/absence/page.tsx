/* app/dashboard/absence/page.tsx */
import PageTemplate from "@/components/layout/PageTemplate";

export default function AbsencePage() {
  return (
    <PageTemplate
      title="Absence"
      currentSection="Absence"
      stats={[
        { label: "Active absences", value: 4 },
        { label: "Awaiting approval", value: 1 },
        { label: "This month", value: 7 }
      ]}
      statCols={3}
      actions={[
        { title: "New absence", description: "Create a new absence", href: "/dashboard/absence/new" },
        { title: "View list", description: "See all absences", href: "/dashboard/absence/list" }
      ]}
      actionCols={2}
    />
  );
}
