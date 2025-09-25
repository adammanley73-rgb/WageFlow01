/* @ts-nocheck */
// app/dashboard/employees/new/sharedFields.tsx
import * as React from "react";

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

export function Section({ title, children }: SectionProps) {
  return (
    <section className="rounded-2xl bg-neutral-100/70 p-5 shadow-sm ring-1 ring-neutral-200">
      <h3 className="mb-4 text-lg font-semibold text-neutral-900">{title}</h3>
      {/* 2-col on md+, single-col on small screens */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

type FieldProps = {
  label: string;
  /** Optional small helper text shown under the label */
  hint?: React.ReactNode;
  children: React.ReactNode;
};

export function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-neutral-800">{label}</label>
        {hint ? (
          <span className="text-xs text-neutral-500">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

