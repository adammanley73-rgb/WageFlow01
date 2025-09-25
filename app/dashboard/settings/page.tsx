/* @ts-nocheck */
export const dynamic = 'force-dynamic';

import React from 'react';

export default async function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-300/40 via-cyan-200/30 to-emerald-200/40">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-neutral-600">Manage company and application preferences.</p>
        </header>

        {/* Tabs */}
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-neutral-200 overflow-hidden">
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700">
            Company Settings
          </div>
          <div className="p-4 space-y-4">
            <form>
              <div>
                <label className="block text-sm font-medium mb-1">Company name</label>
                <input
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                  name="company_name"
                  defaultValue=""
                  placeholder="Your company Ltd"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">PAYE reference</label>
                <input
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                  name="paye_ref"
                  defaultValue=""
                  placeholder="123/AB45678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Accounts office reference</label>
                <input
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                  name="accounts_office_ref"
                  defaultValue=""
                  placeholder="123AB45678901"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Archive control placeholder */}
        <div className="mt-8 rounded-xl bg-white shadow-sm ring-1 ring-neutral-200 overflow-hidden">
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700">
            Archive
          </div>
          <div className="p-4 text-sm text-neutral-600">
            Payroll runs can be archived automatically when FPS is submitted.
            Archived runs are hidden by default.
          </div>
        </div>
      </div>
    </div>
  );
}

