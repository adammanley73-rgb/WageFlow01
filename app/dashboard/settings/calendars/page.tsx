// app/dashboard/settings/calendars/page.tsx

import React from "react";
import HeaderBanner from "@components/ui/HeaderBanner";
import Link from "next/link";

export default function SettingsCalendarsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-500 to-blue-700 px-4 py-6 md:px-8 lg:px-12">
      <HeaderBanner title="Settings" currentSection="settings" />

      <main className="mx-auto max-w-6xl">
        <section
          aria-labelledby="cal-title"
          className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <h2 id="cal-title" className="sr-only">
            Pay calendars
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 p-5">
              <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                Monthly calendar
              </h3>
              <p className="text-neutral-700">
                Configure monthly pay periods, cutoffs, and payment dates.
              </p>
              <div className="mt-4">
                <Link
                  href="/dashboard/settings/calendars/monthly"
                  className="inline-flex items-center justify-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  Manage monthly
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 p-5">
              <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                Weekly calendar
              </h3>
              <p className="text-neutral-700">
                Configure weekly periods, pay weeks, and submission windows.
              </p>
              <div className="mt-4">
                <Link
                  href="/dashboard/settings/calendars/weekly"
                  className="inline-flex items-center justify-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  Manage weekly
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
