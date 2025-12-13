"use client";

import React from "react";

export default function WizardHeader() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-2xl font-semibold tracking-tight text-slate-900">
          New Employee Wizard
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            Employees
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            Starter
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            Details
          </span>
        </nav>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Complete the steps below. You can save and return later.
      </p>
    </div>
  );
}
