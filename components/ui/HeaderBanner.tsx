/* C:\Users\adamm\Projects\wageflow01\components\ui\HeaderBanner.tsx */
import Link from "next/link";
import { ReactNode } from "react";

type NavItem = {
  key: string;
  label: string;
  href: string;
};

interface HeaderBannerProps {
  title: string;
  currentSection: string;
  navChips: NavItem[];
  rightSlot?: ReactNode;
}

/**
 * HeaderBanner
 * - Title on left, chips on right (same row).
 * - Darker logo blue (#003C8F) used for title and chips.
 * - Active page chip hidden (case/whitespace-insensitive).
 */
export default function HeaderBanner({
  title,
  currentSection,
  navChips,
  rightSlot,
}: HeaderBannerProps) {
  const currentKey = (currentSection ?? "").toString().trim().toLowerCase();

  const chips = (navChips ?? []).filter(
    (c) => (c.key ?? "").toString().trim().toLowerCase() !== currentKey
  );

  return (
    <header className="w-full">
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-neutral-200 sm:px-6 lg:px-8">
          <img
            src="/wageflow-logo.png"
            alt="WageFlow"
            width={48}
            height={48}
            className="h-12 w-12 rounded-md object-contain"
          />

          {/* Title in darker logo blue */}
          <h1 className="text-4xl font-extrabold tracking-tight text-[#003C8F]">
            {title}
          </h1>

          <div className="ml-auto flex items-center gap-3">
            {chips.map((chip) => (
              <Link
                key={chip.key}
                href={chip.href}
                className="inline-flex items-center rounded-full bg-[#003C8F] px-5 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#003C8F]"
              >
                {chip.label}
              </Link>
            ))}
            {rightSlot}
          </div>
        </div>
      </div>
    </header>
  );
}
