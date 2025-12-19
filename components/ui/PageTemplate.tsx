// C:\Users\adamm\Projects\wageflow01\components\ui\PageTemplate.tsx
// Reusable page shell and tiles that match the Dashboard "gold standard".

import React from "react";
import Link from "next/link";
import HeaderBanner from "./HeaderBanner";
import { Inter, Manrope } from "next/font/google";

const manrope = Manrope({ subsets: ["latin"], display: "swap" });
const inter = Inter({ subsets: ["latin"], display: "swap" });

type HeaderMode = "default" | "wizard";

type Section = "dashboard" | "employees" | "payroll" | "absence" | "reports" | "settings" | string;

type PageTemplateProps = {
  title: string;
  currentSection: Section;
  children: React.ReactNode;

  // Wizard guardrail support
  headerMode?: HeaderMode;
  backHref?: string;
  backLabel?: string;
};

export default function PageTemplate({
  title,
  currentSection,
  children,
  headerMode = "default",
  backHref,
  backLabel,
}: PageTemplateProps) {
  return (
    <main
      className={`${manrope.className} min-h-screen w-full`}
      style={{
        background:
          "linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)",
      }}
    >
      <header className="w-full pt-6 pb-4">
        <div className="mx-auto w-[min(1100px,92vw)]">
          <HeaderBanner
            title={title}
            currentSection={String(currentSection)}
            mode={headerMode}
            backHref={backHref}
            backLabel={backLabel}
          />
        </div>
      </header>

      <section className="mx-auto w-[min(1100px,92vw)] pb-12">{children}</section>
    </main>
  );
}

/* ---------- Shared UI primitives that match Dashboard ---------- */

export function HeaderNavLink({
  href,
  label,
  compact,
}: {
  href: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center rounded-xl text-white hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{
        backgroundColor: "#1e40af",
        width: compact ? "7.5rem" : "8rem",
        height: compact ? "2.25rem" : "2.5rem",
      }}
    >
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}

const tileBase =
  "rounded-2xl bg-white/95 shadow-sm ring-1 ring-neutral-300 p-5 flex flex-col items-center justify-center text-center h-44";

export function StatTile({ title, value }: { title: string; value: string }) {
  return (
    <div className={tileBase}>
      <div className="text-base font-bold" style={{ color: "#111827" }}>
        {title}
      </div>
      <div className="mt-2">
        <span className={`${inter.className} text-[27px] font-extrabold tracking-tight`}>
          {value}
        </span>
      </div>
    </div>
  );
}

export function ActionTile({
  title,
  href,
  description,
}: {
  title: string;
  href: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className={`${tileBase} transition-transform transform hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2`}
    >
      <div className="text-base font-bold" style={{ color: "#111827" }}>
        {title}
      </div>
      <p className="mt-2 text-sm text-neutral-600">{description}</p>
    </Link>
  );
}
