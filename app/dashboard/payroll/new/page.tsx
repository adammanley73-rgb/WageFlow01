// C:\Users\adamm\Projects\wageflow01\app\dashboard\payroll\new\page.tsx
import React from "react";

export default function PayrollNewPage() {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold text-neutral-900">
        Payroll Run Wizard
      </h2>
      <p className="text-sm text-neutral-700">
        This page is now using the gold-standard wizard shell. Next step is
        wiring the workflow logic back in.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-neutral-600">Pay period start</span>
          <input
            type="date"
            className="mt-1 w-full rounded border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm"
            readOnly
          />
        </label>

        <label className="block">
          <span className="text-xs text-neutral-600">Pay period end</span>
          <input
            type="date"
            className="mt-1 w-full rounded border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm"
            readOnly
          />
        </label>

        <label className="block">
          <span className="text-xs text-neutral-600">Payment date</span>
          <input
            type="date"
            className="mt-1 w-full rounded border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm"
            readOnly
          />
        </label>

        <label className="block">
          <span className="text-xs text-neutral-600">Pay frequency</span>
          <input
            className="mt-1 w-full rounded border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm"
            placeholder="Monthly"
            readOnly
          />
        </label>
      </div>

      <div className="pt-6">
        <button
          className="inline-flex items-center rounded-full bg-[#0f3c85] px-5 py-2 text-sm font-semibold text-white opacity-60 cursor-not-allowed"
          disabled
        >
          Start payroll run (disabled)
        </button>
      </div>
    </div>
  );
}
