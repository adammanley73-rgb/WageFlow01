/* components/ui/ActionButton.tsx */
"use client";

import Link from "next/link";

type Variant = "primary" | "success" | "ghost";

export default function ActionButton({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5";
  const styles =
    variant === "primary"
      ? "bg-[#2563eb] text-white ring-1 ring-[#1e40af]"
      : variant === "success"
      ? "bg-[#16a34a] text-white ring-1 ring-[#166534]"
      : "bg-white text-neutral-900 ring-1 ring-neutral-300";
  return (
    <Link href={href} className={`${base} ${styles} ${className}`}>
      {children}
    </Link>
  );
}
