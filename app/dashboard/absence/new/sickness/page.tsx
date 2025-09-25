/* @ts-nocheck */
// app/dashboard/absence/new/sickness/page.tsx
import React from "react";
import Link from "next/link";
import HeaderBanner from "@components/ui/HeaderBanner";

export default function NewSicknessAbsence() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-500 to-blue-800 text-gray-900">
      <HeaderBanner title="Record Sickness Absence" />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Record Sickness Absence</h1>
        <p className="mb-8">
          Complete the form and save. This writes to localStorage and updates
          Absence stats.
        </p>

        <div className="bg-white rounded-lg shadow p-6">
          <form className="space-y-6">
            {/* Employee picker */}
            <div>
              <label className="block font-medium mb-1">Employee</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Search name, NI, pay group"
                  className="flex-1 border rounded px-3 py-2"
                />
                <button
                  type="button"
                  className="bg-blue-900 text-white px-3 py-2 rounded hover:bg-blue-800"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  className="bg-gray-300 text-black px-3 py-2 rounded hover:bg-gray-400"
                >
                  Clear
                </button>
              </div>
              <select className="w-full border rounded px-3 py-2">
                <option>Select employee</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                1 employees. Showing 1.
              </p>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-medium mb-1">Start date</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">End date</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            {/* Partial day */}
            <div>
              <label className="block font-medium mb-1">Partial day</label>
              <div className="flex gap-4">
                <label>
                  <input type="radio" name="partial" defaultChecked /> No
                </label>
                <label>
                  <input type="radio" name="partial" /> Â¼ day
                </label>
                <label>
                  <input type="radio" name="partial" /> Â½ day
                </label>
                <label>
                  <input type="radio" name="partial" /> Â¾ day
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block font-medium mb-1">Notes</label>
              <textarea
                placeholder="Optional"
                className="w-full border rounded px-3 py-2"
              ></textarea>
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800"
              >
                Save
              </button>
              <button
                type="reset"
                className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
              >
                Reset
              </button>
              <button
                type="button"
                className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <Link
                href="/dashboard/absence/list"
                className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800"
              >
                Go to Absence list
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

