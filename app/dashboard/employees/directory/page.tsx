'use client';
/* @ts-nocheck */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import HeaderBanner from "@components/ui/HeaderBanner";
import { getAll, subscribe, removeEmployee, type Employee } from "@lib/employeeStore";
import { hasPayrollForEmployee } from "@lib/payrollIndex";

export default function EmployeeDirectoryPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    // initial load
    (async () => {
      try {
        const list = await getAll();
        if (alive) setEmployees(Array.isArray(list) ? list : []);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    // preview-safe subscription (no-op in stub but harmless)
    const unsub = subscribe((list: Employee[]) => {
      if (alive) setEmployees(Array.isArray(list) ? list : []);
    });

    return () => {
      alive = false;
      if (typeof unsub === "function") unsub();
    };
  }, []);

  async function onRemove(id: string) {
    try {
      await removeEmployee(id);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    } catch {
      // ignore in preview
    }
  }

  return (
    <div className="min-h-screen">
      <HeaderBanner title="Employee Directory (Preview)" />
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Employees</h2>
          <Link
            href="/dashboard/employees/new"
            className="rounded bg-gray-200 px-3 py-2 text-sm"
          >
            Add employee
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : employees.length === 0 ? (
          <div className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-700">
            No employees in preview.
          </div>
        ) : (
          <div className="overflow-x-auto rounded border border-gray-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Payroll</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <Row key={e.id} emp={e} onRemove={onRemove} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ emp, onRemove }: { emp: Employee; onRemove: (id: string) => void }) {
  const [hasPayroll, setHasPayroll] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const flag = await hasPayrollForEmployee(emp.id);
        if (alive) setHasPayroll(!!flag);
      } catch {
        if (alive) setHasPayroll(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [emp?.id]);

  const name = [emp?.first_name, emp?.last_name].filter(Boolean).join(" ") || "(Unnamed)";

  return (
    <tr className="border-t">
      <td className="px-4 py-2">{name}</td>
      <td className="px-4 py-2">{emp?.email || ""}</td>
      <td className="px-4 py-2">{hasPayroll ? "Yes" : "No"}</td>
      <td className="px-4 py-2">
        <div className="flex gap-2">
          <Link
            href={`/dashboard/employees/${emp.id}/edit/details`}
            className="rounded bg-gray-200 px-2 py-1 text-xs"
          >
            Edit
          </Link>
          <button
            type="button"
            className="rounded bg-gray-200 px-2 py-1 text-xs"
            onClick={() => onRemove(emp.id)}
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
}
