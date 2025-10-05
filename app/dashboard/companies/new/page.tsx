// app/dashboard/companies/new/page.tsx
/* @ts-nocheck */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HeaderBanner from "@/components/ui/HeaderBanner";
import { createCompanyAction } from "./action";

export default function NewCompanyPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res = await createCompanyAction(data);
        if (!res?.ok) {
          setError(res?.error ?? "Failed to create company.");
          return;
        }
        // Go to the company selector so the new company shows up
        router.push("/dashboard/companies");
      } catch (err) {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-blue-800">
      <HeaderBanner title="Companies" currentSection="dashboard" />

      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-300">
            <h2 className="text-xl font-semibold text-neutral-800">New company</h2>
          </div>

          <form onSubmit={onSubmit} className="p-4 space-y-4">
            {error && <div className="text-sm text-red-700">{error}</div>}

            <div>
              <label className="block text-sm text-neutral-700 mb-1">Company name</label>
              <input
                name="name"
                placeholder="e.g. The Business Consortium Ltd"
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 bg-blue-800 text-white text-sm disabled:opacity-60"
              >
                {pending ? "Creating..." : "Create company"}
              </button>

              <Link
                href="/dashboard/companies"
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 bg-neutral-200 text-neutral-900 text-sm"
              >
                Cancel
              </Link>
            </div>
          </form>

          <div className="px-4 pb-4 text-xs text-neutral-500">
            Company will be upserted by unique name. You’ll be added as owner (if signed
            in) and the company will be selected for your session automatically.
          </div>
        </div>
      </div>
    </div>
  );
}
