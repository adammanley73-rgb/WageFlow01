/* components/layout/PageTemplate.tsx */
import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { Inter, Manrope } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });

type ChipKey = "Dashboard" | "Employees" | "Payroll" | "Absence" | "Settings";
type Chip = { label: string; href: string; key: ChipKey };

type StatSpec = { label: string; value: string | number; id?: string };
type ActionSpec = { title: string; description?: string; href?: string; id?: string };

export type PageTemplateProps = {
  title: string;
  currentSection: ChipKey;
  stats?: StatSpec[];
  statCols?: 2 | 3 | 4;
  actions?: ActionSpec[];
  actionCols?: 2 | 3 | 4;
  children?: ReactNode;
};

/** Unified visuals: same grey & height for both rows */
const TILE_MIN_H = "min-h-[8.5rem]";
const TILE_SHARED =
  "rounded-2xl ring-1 border !bg-neutral-300 !ring-neutral-400 !border-neutral-400";

/** Base shell: no centering here; children control layout */
function BaseTile({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${TILE_SHARED} ${TILE_MIN_H} p-6`}
      style={{ backgroundColor: "#d4d4d4" }} // fallback for neutral-300
    >
      {children}
    </div>
  );
}

/** Stat tiles remain vertically centered */
function StatTile({ label, value }: StatSpec) {
  return (
    <BaseTile>
      <div className="flex h-full w-full flex-col items-center justify-center text-center">
        <div className="text-sm font-semibold text-neutral-900">{label}</div>
        <div
          className={`${inter.variable} mt-2 text-[27px] leading-none font-semibold`}
          style={{ fontFamily: "var(--font-inter)" }}
        >
          {value}
        </div>
      </div>
    </BaseTile>
  );
}

/**
 * Action tiles:
 * - Title row has fixed height so baselines match.
 * - Description block has fixed min-height and is TOP-aligned,
 *   so the first line of text starts at the same Y across all tiles.
 */
function ActionTile({ title, description, href }: ActionSpec) {
  const body = (
    <BaseTile>
      <div className="flex h-full w-full flex-col items-center text-center">
        {/* fixed title row height */}
        <div className="text-base font-semibold text-neutral-900 min-h-[24px] flex items-end">
          {title}
        </div>

        {/* descriptor starts at consistent position; no vertical centering */}
        <div className="mt-2 text-sm text-neutral-800 leading-snug min-h-[40px] w-full">
          {description ?? ""}
        </div>

        {/* optional space-filler to keep total height even if description is short */}
        <div className="mt-auto" />
      </div>
    </BaseTile>
  );
  return href ? (
    <Link href={href} className="block hover:-translate-y-0.5 transition-transform">
      {body}
    </Link>
  ) : (
    body
  );
}

export default function PageTemplate({
  title,
  currentSection,
  stats = [],
  statCols = 3,
  actions = [],
  actionCols = 2,
  children
}: PageTemplateProps) {
  // Only show Settings chip on Dashboard
  const baseChips: Chip[] = [
    { label: "Dashboard", href: "/dashboard", key: "Dashboard" },
    { label: "Employees", href: "/dashboard/employees", key: "Employees" },
    { label: "Payroll", href: "/dashboard/payroll", key: "Payroll" },
    { label: "Absence", href: "/dashboard/absence", key: "Absence" }
  ];
  const chips: Chip[] =
    currentSection === "Dashboard"
      ? [...baseChips, { label: "Settings", href: "/dashboard/settings", key: "Settings" }]
      : baseChips;

  const visibleChips = chips.filter((c) => c.key !== currentSection);

  return (
    <div
      className={`${manrope.variable} ${inter.variable} min-h-dvh bg-gradient-to-b from-[#10b981] to-[#1e40af]`}
      style={{ fontFamily: "var(--font-manrope)" }}
    >
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="rounded-2xl bg-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/WageFlowLogo.png"
              alt="WageFlow"
              width={64}
              height={64}
              className="h-16 w-16 object-contain"
            />
            <h1 className="text-4xl font-semibold" style={{ color: "#1e40af" }}>
              {title}
            </h1>
          </div>
          <nav className="flex items-center gap-2">
            {visibleChips.map((chip) => (
              <Link
                key={chip.key}
                href={chip.href}
                className="w-32 inline-flex items-center justify-center rounded-full bg-[#1e40af] text-white text-sm h-10 hover:-translate-y-0.5 transition-transform"
              >
                {chip.label}
              </Link>
            ))}
          </nav>
        </header>

        {stats.length > 0 && (
          <section className="mt-6">
            <div
              className={`grid gap-4 ${
                statCols === 4
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                  : statCols === 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-3"
              }`}
            >
              {stats.map((s, i) => (
                <StatTile key={s.id ?? i} {...s} />
              ))}
            </div>
          </section>
        )}

        {actions.length > 0 && (
          <section className="mt-4">
            <div
              className={`grid gap-4 ${
                actionCols === 4
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                  : actionCols === 3
                  ? "grid-cols-1 sm:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2"
              }`}
            >
              {actions.map((a, i) => (
                <ActionTile key={a.id ?? i} {...a} />
              ))}
            </div>
          </section>
        )}

        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}
