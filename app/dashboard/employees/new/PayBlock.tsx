'use client';
import React from "react";

export default function PayBlock() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-800">Pay</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs text-gray-600">Pay type</span>
          <select
            id="pay_type"
            name="pay_type"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            defaultValue="salary"
          >
            <option value="salary">Salary</option>
            <option value="hourly">Hourly</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-gray-600">Pay rate</span>
          <input
            id="pay_rate"
            name="pay_rate"
            type="number"
            step="0.01"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="0.00"
          />
        </label>

        <label className="block">
          <span className="text-xs text-gray-600">Pay frequency</span>
          <select
            id="pay_frequency"
            name="pay_frequency"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            defaultValue="monthly"
          >
            <option value="monthly">Monthly</option>
            <option value="fourweekly">Four-weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-gray-600">Effective from</span>
          <input
            id="pay_effective_from"
            name="pay_effective_from"
            type="date"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
    </div>
  );
}
