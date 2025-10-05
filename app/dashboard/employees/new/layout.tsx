/* app/dashboard/employees/new/layout.tsx */
import { ReactNode } from "react";

export default function EmployeesNewLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 min-h-0">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl bg-white ring-1 ring-neutral-300 p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
