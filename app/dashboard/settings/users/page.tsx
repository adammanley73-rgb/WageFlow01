/* C:\Users\adamm\Projects\wageflow01\app\dashboard\settings\users\page.tsx */
import React from "react";

const S = {
  page: { maxWidth: "72rem", margin: "0 auto" },
  wrap: { background: "white", borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.5rem" },
  panel: { border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem" },
  input: "mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm",
  btn: "inline-flex items-center rounded-md bg-blue-700 px-3 py-1.5 text-white text-sm disabled:opacity-60"
};

export default function SettingsUsersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-500 to-blue-700 px-4 py-6 md:px-8 lg:px-12">
      {/* Minimal header card to avoid HeaderBanner prop requirements */}
      <div className="w-full bg-white border-b border-neutral-200 px-6 py-4 rounded-t-xl">
        <h1 className="text-xl font-semibold text-blue-700">Settings</h1>
      </div>

      <main style={S.page}>
        <div style={S.wrap}>
          <div style={S.panel}>
            <div className="flex gap-2 items-center mb-4 flex-wrap">
              <input className={S.input} placeholder="Search users (disabled)" readOnly />
              <button className={S.btn} disabled>Invite user (disabled)</button>
            </div>

            <div className="rounded-lg border border-neutral-200 p-4">
              <h2 className="text-sm font-medium text-neutral-900">Users</h2>
              <p className="mt-2 text-sm text-neutral-700">
                User management is disabled in this preview build. This placeholder keeps CI and typecheck green
                until the real settings wiring lands.
              </p>

              <ul className="mt-3 list-disc pl-5 text-sm text-neutral-700">
                <li>Role-based access control</li>
                <li>Company scoping</li>
                <li>Owner and admin roles</li>
              </ul>

              <div className="mt-4">
                <button className={S.btn} disabled>Save changes (disabled)</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
