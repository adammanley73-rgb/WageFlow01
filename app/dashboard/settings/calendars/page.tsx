/* C:\Users\adamm\Projects\wageflow01\app\dashboard\settings\calendars\page.tsx */
import React from "react";

export default function SettingsCalendarsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-500 to-blue-700 px-4 py-6 md:px-8 lg:px-12">
      {/* Minimal header card to avoid HeaderBanner prop requirements */}
      <div className="w-full bg-white border-b border-neutral-200 px-6 py-4 rounded-t-xl">
        <h1 className="text-xl font-semibold text-blue-700">Settings</h1>
      </div>

      <main className="mx-auto max-w-6xl">
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-medium text-neutral-900">Calendars</h2>
          <p className="mt-2 text-sm text-neutral-700">
            Calendar configuration is disabled in this preview build. This placeholder keeps CI and
            typecheck green until Settings wiring is complete.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 p-4">
              <h3 className="text-sm font-medium text-neutral-800">Working week</h3>
              <p className="mt-2 text-sm text-neutral-700">Mon to Fri</p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4">
              <h3 className="text-sm font-medium text-neutral-800">Public holidays</h3>
              <p className="mt-2 text-sm text-neutral-700">UK England and Wales</p>
            </div>
          </div>

          <div className="mt-6">
            <button
              className="inline-flex items-center rounded-md bg-blue-700 px-4 py-2 text-white text-sm disabled:opacity-60"
              disabled
            >
              Save changes (disabled)
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
