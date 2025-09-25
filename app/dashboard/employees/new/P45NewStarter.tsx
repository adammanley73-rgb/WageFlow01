/* @ts-nocheck */
"use client";

import { useState } from "react";

export default function P45NewStarter() {
  const [hasP45, setHasP45] = useState(false);
  const [starter, setStarter] = useState<"A" | "B" | "C">("B");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          id="has_p45"
          name="has_p45"
          type="checkbox"
          className="h-4 w-4"
          checked={hasP45}
          onChange={(e) => setHasP45(e.target.checked)}
        />
        <label htmlFor="has_p45" className="text-sm">
          Employee has a P45 from previous employer
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <span className="text-sm font-semibold text-neutral-800">
          New starter declaration
        </span>
        {(["A", "B", "C"] as const).map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="starter_decl"
              value={opt}
              checked={starter === opt}
              onChange={() => setStarter(opt)}
            />
            Option {opt}
          </label>
        ))}
      </div>

      {hasP45 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-semibold text-neutral-800">
              Provide P45 details
            </label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-800">
              Previous tax code (from P45)
            </label>
            <input
              name="p45_tax_code"
              type="text"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
              placeholder="1257L"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-800">
              Prev. employer PAYE ref
            </label>
            <input
              name="p45_paye_ref"
              type="text"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
              placeholder="123/A12345"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-800">
              Total pay to date (Â£)
            </label>
            <input
              name="p45_total_pay"
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-800">
              Total tax to date (Â£)
            </label>
            <input
              name="p45_total_tax"
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e40af]"
            />
          </div>
        </div>
      )}
    </div>
  );
}

