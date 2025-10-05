/* @ts-nocheck */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import HeaderBanner from "@/components/ui/HeaderBanner";

// Server-side helpers
import { createServerAction } from "./server-action";

export default function NewEmployeePage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);

    startTransition(async () => {
      const res = await createServerAction(data);
      if (!res.ok) {
        setError(res.error || "Failed to create employee.");
        return;
      }
      router.push("/dashboard/employees");
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-blue-800">
      <HeaderBanner currentSection="Employees" />
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-300">
            <h2 className="text-xl font-semibold text-neutral-800">New employee</h2>
          </div>

          <form onSubmit={onSubmit} className="p-4 space-y-4">
            {error && <div className="text-sm text-red-700">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-neutral-700 mb-1">First name</label>
                <input name="first_name" className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm text-neutral-700 mb-1">Last name</label>
                <input name="last_name" className="w-full border rounded-lg px-3 py-2" required />
              </div>
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-1">Email</label>
              <input type="email" name="email" className="w-full border rounded-lg px-3 py-2" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-neutral-700 mb-1">Job title</label>
                <input name="job_title" className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-neutral-700 mb-1">NI number</label>
                <input name="ni_number" className="w-full border rounded-lg px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-1">Pay frequency</label>
              <select name="pay_frequency" className="w-full border rounded-lg px-3 py-2" required>
                <option value="monthly">Monthly</option>
                <option value="fourweekly">Four-weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="weekly">Weekly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 bg-blue-800 text-white text-sm disabled:opacity-60"
              >
                {pending ? "Creating..." : "Create employee"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/employees")}
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 bg-neutral-200 text-neutral-900 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ---------------- Server action file co-located ----------------

// Next requires server code to be in a separate "use server" module in App Router.
// We colocate it in the same folder to keep it simple.

export const dynamic = "force-dynamic";
