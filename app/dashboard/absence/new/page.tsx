/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\new\page.tsx

"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ACTION_BTN =
  "rounded-full bg-blue-700 px-5 py-2 text-sm font-medium text-white";
const CARD =
  "rounded-2xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6";
const TILE_ACTIVE =
  "flex flex-col justify-between rounded-xl bg-white border border-neutral-200 shadow-sm px-5 py-4 h-full";
const TILE_DISABLED =
  "flex flex-col justify-between rounded-xl bg-neutral-200 border border-neutral-300 px-5 py-4 h-full opacity-70 cursor-not-allowed";

export default function NewAbsencePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-300 via-teal-400 to-blue-600 font-[var(--font-manrope,inherit)]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header banner – matches other wizards */}
        <div className="mb-6 flex flex-col gap-4 rounded-xl bg-white px-6 py-6 ring-1 ring-neutral-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/WageFlowLogo.png"
              alt="WageFlow"
              width={64}
              height={64}
              priority
            />
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-blue-800">
                New absence
              </h1>
              <p className="mt-1 text-sm text-neutral-700">
                Choose the type of absence you want to record. Each option takes
                you into the relevant wizard so the absence feeds correctly into
                payroll.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                history.length > 1
                  ? router.back()
                  : router.push("/dashboard/absence")
              }
              className={ACTION_BTN}
            >
              Back
            </button>
          </div>
        </div>

        {/* Absence type selector – gold-standard style card */}
        <div className={CARD}>
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">
            Select absence type
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Annual leave */}
            <div>
              <div className={TILE_ACTIVE}>
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">
                    Annual leave
                  </h3>
                  <p className="mt-1 text-sm text-neutral-700">
                    Book paid holiday for an employee. Use this for standard
                    annual leave days.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <Link
                    href="/dashboard/absence/new/annual"
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    Start annual leave
                  </Link>
                  <Link
                    href="/dashboard/absence/new/annual"
                    className="text-xs text-neutral-600 hover:text-neutral-800"
                  >
                    Continue →
                  </Link>
                </div>
              </div>
            </div>

            {/* Sickness */}
            <div>
              <div className={TILE_ACTIVE}>
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">
                    Sickness
                  </h3>
                  <p className="mt-1 text-sm text-neutral-700">
                    Record sickness absence. This feeds into Statutory Sick Pay
                    and sickness reporting.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <Link
                    href="/dashboard/absence/new/sickness"
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    Start sickness
                  </Link>
                  <Link
                    href="/dashboard/absence/new/sickness"
                    className="text-xs text-neutral-600 hover:text-neutral-800"
                  >
                    Continue →
                  </Link>
                </div>
              </div>
            </div>

            {/* Maternity / Adoption / Paternity – placeholder for SMP/SAP/SPP/ShPP */}
            <div>
              <div className={TILE_DISABLED} aria-disabled="true">
                <div>
                  <h3 className="text-base font-semibold text-neutral-800">
                    Maternity / Adoption / Paternity
                  </h3>
                  <p className="mt-1 text-sm text-neutral-700">
                    For statutory maternity, paternity or adoption absence.
                    This will feed into statutory pay once the wizards are
                    wired.
                  </p>
                </div>
                <div className="mt-3 text-sm text-neutral-600">
                  Coming soon
                </div>
              </div>
            </div>

            {/* Unpaid / Other – placeholder */}
            <div>
              <div className={TILE_DISABLED} aria-disabled="true">
                <div>
                  <h3 className="text-base font-semibold text-neutral-800">
                    Unpaid leave / Other
                  </h3>
                  <p className="mt-1 text-sm text-neutral-700">
                    Unpaid leave, compassionate leave or other special
                    absences. Placeholder until configured.
                  </p>
                </div>
                <div className="mt-3 text-sm text-neutral-600">
                  Coming soon
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-neutral-700">
            Absences you record here will be available for payroll runs and
            reporting. Use Annual leave and Sickness for now, other absence
            types will be enabled as their wizards go live.
          </p>
        </div>
      </div>
    </div>
  );
}
