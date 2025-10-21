/* app/dashboard/payroll/page.tsx */
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

export default function PayrollPage() {
  return (
    <PageTemplate title="Payroll" currentSection="Payroll">
      {/* Card container */}
      <div className="rounded-xl bg-neutral-100 ring-1 ring-neutral-300 overflow-hidden">
        {/* Table header */}
        <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-50">
          <div className="text-sm font-semibold text-neutral-900">
            Payroll runs
          </div>
          <div className="text-xs text-neutral-700">
            Displays all pay runs for the active company.
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <colgroup>
              <col className="w-[16rem]" />
              <col className="w-[10rem]" />
              <col className="w-[10rem]" />
              <col className="w-[10rem]" />
              <col className="w-[10rem]" />
              <col className="w-[12rem]" />
            </colgroup>
            <thead className="bg-neutral-100">
              <tr className="border-b-2 border-neutral-300">
                <th className="text-left px-4 py-3 sticky left-0 bg-neutral-100">
                  Run ID
                </th>
                <th className="text-left px-4 py-3">Period Start</th>
                <th className="text-left px-4 py-3">Period End</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b-2 border-neutral-300">
                <td
                  className="px-4 py-6 sticky left-0 bg-white"
                  colSpan={5}
                >
                  <div className="text-neutral-800">No payroll runs yet.</div>
                  <div className="text-neutral-700 text-xs">
                    Use the button below to start a new run.
                  </div>
                </td>
                <td className="px-4 py-6 text-right bg-white">
                  <div className="inline-flex gap-2">
                    <ActionButton href="/dashboard/payroll/new" variant="success">
                      Create payroll run
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
        <ActionButton href="/dashboard/payroll/new" variant="primary">
          Create payroll run
        </ActionButton>
      </div>
    </PageTemplate>
  );
}
