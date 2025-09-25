'use client';
/* @ts-nocheck */
import React, { useState } from "react";
import HeaderBanner from "@components/ui/HeaderBanner";
import PayBlock from "./PayBlock";

export default function NewEmployeePage() {
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Preview stub: do nothing, just simulate save
    setSaving(true);
    setTimeout(() => setSaving(false), 300);
  }

  return (
    <div className="min-h-screen">
      <HeaderBanner title="New Employee (Preview)" />
      <form className="p-6 space-y-6" onSubmit={onSubmit}>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-4 text-sm font-semibold text-gray-800">Personal</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs text-gray-600">First name</span>
              <input
                id="first_name"
                name="first_name"
                type="text"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Jane"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">Last name</span>
              <input
                id="last_name"
                name="last_name"
                type="text"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Doe"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">Email</span>
              <input
                id="email"
                name="email"
                type="email"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="jane@example.com"
              />
            </label>
          </div>
        </div>

        <PayBlock />

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <a
            href="/dashboard/employees/directory"
            className="rounded bg-gray-200 px-4 py-2 text-sm"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
