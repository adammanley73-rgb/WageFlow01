/* C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\requests\page.tsx */
import React from "react";

export default function AbsenceRequestsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-500 to-blue-700 px-4 py-6 md:px-8 lg:px-12">
      {/* Minimal header card to avoid HeaderBanner prop requirements */}
      <div className="w-full bg-white border-b border-neutral-200 px-6 py-4 rounded-t-xl">
        <h1 className="text-xl font-semibold text-blue-700">Absence</h1>
      </div>

      <main className="mx-auto max-w-6xl">
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-700">
            Requests list placeholder. This compiles cleanly while we wire data.
          </p>
        </section>
      </main>
    </div>
  );
}
