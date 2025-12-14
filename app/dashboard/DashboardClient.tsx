/* @ts-nocheck */
"use client";

import React from "react";
import Link from "next/link";

type Counts = {
  employees?: number;
  payrollRuns?: number;
  pendingTasks?: number;
  notices?: number;
};

const CARD_BG = "#c8c8c8"; // unified tile background (your ÔÇ£neutral-325ÔÇØ)

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border border-neutral-200 p-6 shadow-sm text-center"
      style={{ backgroundColor: CARD_BG }}
    >
      {children}
    </div>
  );
}

export default function DashboardClient({ counts }: { counts: Counts }) {
  const employees = counts.employees ?? 0;
  const payrollRuns = counts.payrollRuns ?? 0;
  const pendingTasks = counts.pendingTasks ?? 0;
  const notices = counts.notices ?? 0;

  const btn =
    "inline-flex items-center justify-center rounded-2xl bg-[#1e40af] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 w-[160px]";

  // Make stat titles same size as action card titles
  const statTitle = "text-lg font-semibold text-neutral-900";
  const statNumber = "mt-2 text-4xl font-bold";
  const bodyText = "mt-2 text-sm text-neutral-900";

  return (
    <div className="space-y-6">
      {/* Stat tiles */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className={statTitle}>Employees</div>
          <div className={statNumber}>{employees}</div>
          <div className="mt-4 flex justify-center">
            <Link href="/dashboard/employees" className={btn}>
              View Employees
            </Link>
          </div>
        </Card>

        <Card>
          <div className={statTitle}>Payroll Runs</div>
          <div className={statNumber}>{payrollRuns}</div>
          <div className="mt-4 flex justify-center">
            <Link href="/dashboard/payroll" className={btn}>
              Go to Payroll
            </Link>
          </div>
        </Card>

        <Card>
          <div className={statTitle}>Pending Tasks</div>
          <div className={statNumber}>{pendingTasks}</div>
          <div className="mt-4 flex justify-center">
            <Link href="/dashboard/tasks" className={btn}>
              View Tasks
            </Link>
          </div>
        </Card>

        <Card>
          <div className={statTitle}>Notices</div>
          <div className={statNumber}>{notices}</div>
          <div className="mt-4 flex justify-center">
            <Link href="/dashboard/notices" className={btn}>
              View Notices
            </Link>
          </div>
        </Card>
      </div>

      {/* Action tiles */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-lg font-semibold text-neutral-900">Add Employee</div>
          <p className={bodyText}>Create a new employee record.</p>
          <div className="mt-4 flex justify-center">
            <Link href="/dashboard/employees/new" className={btn}>
              Add Employee
            </Link>
          </div>
        </Card>

        <Card>
          <div className="text-lg font-semibold text-neutral-900">Leaver Wizard</div>
          <p className={bodyText}>Start the employee leaver process.</p>
          <div className="mt-4 flex justify-center">
            <Link href="/dashboard/employees/leaver" className={btn}>
              Leaver Wizard
            </Link>
          </div>
        </Card>

        <Card>
          <div className="text-lg font-semibold text-neutral-900">Run Payroll</div>
          <p className={bodyText}>Start a weekly or monthly run.</p>
          <div className="mt-4 flex justify-center">
            <Link href="/dashboard/payroll" className={btn}>
              Go to Payroll
            </Link>
          </div>
        </Card>

        <Card>
          <div className="text-lg font-semibold text-neutral-900">Record Absence</div>
          <p className={bodyText}>Log sickness or annual leave.</p>
          <div className="mt-4 flex justify-center">
            <Link href="/dashboard/absence" className={btn}>
              Go to Absence
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
