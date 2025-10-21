/* app/dashboard/absence/page.tsx */
import Link from "next/link";
import PageTemplate from "@/components/layout/PageTemplate";

function ActionButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "success" | "ghost";
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5";
  const styles =
    variant === "primary"
      ? "bg-[#2563eb] text-white ring-1 ring-[#1e40af]"
      : variant === "success"
      ? "bg-[#16a34a] text-white ring-1 ring-[#166534]"
      : "bg-white text-neutral-900 ring-1 ring-neutral-300";
  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  );
}

export default function AbsencePage() {
  return (
    <PageTemplate title="Absence" currentSection="Absence">
      {/* Card container */}
      <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
        {/* Table header */}
        <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
          <div className="text-sm font-semibold text-neutral-900">
            Absence records
          </div>
          <div className="text-xs text-neutral-700">
            Displays logged sickness and annual leave entries.
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <colgroup>
              <col className="w-[18rem]" />
              <col className="w-[10rem]" />
              <col className="w-[10rem]" />
              <col className="w-[10rem]" />
              <col className="w-[12rem]" />
            </colgroup>
            <thead className="bg-neutral-100">
              <tr className="border-b-2 border-neutral-300">
                <th className="text-left px-4 py-3 sticky left-0 bg-neutral-100">
                  Employee
                </th>
                <th className="text-left px-4 py-3">Start Date</th>
                <th className="text-left px-4 py-3">End Date</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b-2 border-neutral-300">
                <td
                  className="px-4 py-6 sticky left-0 bg-white"
                  colSpan={4}
                >
                  <div className="text-neutral-800">No absences recorded yet.</div>
                  <div className="text-neutral-700 text-xs">
                    Use the button below to log a new absence.
                  </div>
                </td>
                <td className="px-4 py-6 text-right bg-white">
                  <div className="inline-flex gap-2">
                    <ActionButton href="/dashboard/absence/new" variant="success">
                      Record absence
                    </ActionButton>
                    <ActionButton href="/dashboard" variant="ghost">
                      Back to dashboard
                    </ActionButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Primary action below the table in brand blue */}
      <div className="mt-4">
        <ActionButton href="/dashboard/absence/new" variant="primary">
          Record absence
        </ActionButton>
      </div>
    </PageTemplate>
  );
}
