"use client";

import React, { useEffect, useState } from "react";
import HeaderBanner from "@components/ui/HeaderBanner";
import Link from "next/link";

type AbsenceType = "Sickness" | "Holiday" | "Maternity" | "Paternity" | "Parental" | "Other";
type AbsenceStatus = "pending" | "approved" | "rejected";

interface AbsenceRequest {
  id: string;
  employeeName: string;
  type: AbsenceType;
  startDate: string; // ISO yyyy-mm-dd
  endDate: string;   // ISO yyyy-mm-dd
  status: AbsenceStatus;
}

// Preview-safe placeholder. Replace with real data source later.
function listAbsenceRequests(): AbsenceRequest[] {
  return [];
}

export default function AbsenceRequestsPage() {
  const [items, setItems] = useState<AbsenceRequest[]>([]);

  useEffect(() => {
    setItems(listAbsenceRequests());
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-500 to-blue-700 px-4 py-6 md:px-8 lg:px-12">
      <HeaderBanner title="Absence" currentSection="absence" />

      <main className="mx-auto max-w-6xl">
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-900">Absence requests</h2>
            <Link
              href="/dashboard/absence/new"
              className="inline-flex items-center justify-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              New request
            </Link>
          </div>

          {items.length === 0 ? (
            <p className="text-neutral-700">No absence requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-sm text-neutral-700">
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">End</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b border-neutral-200 text-sm">
                      <td className="px-3 py-2">{r.employeeName}</td>
                      <td className="px-3 py-2">{r.type}</td>
                      <td className="px-3 py-2">{r.startDate}</td>
                      <td className="px-3 py-2">{r.endDate}</td>
                      <td className="px-3 py-2 capitalize">{r.status}</td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/dashboard/absence/requests/${r.id}`}
                          className="rounded-md border border-neutral-300 px-3 py-1 hover:bg-neutral-50"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
