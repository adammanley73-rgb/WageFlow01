// C:\Users\adamm\Projects\wageflow01\components\ui\ActiveCompanyBanner.tsx

import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type CookieJar = ReturnType<typeof cookies>;

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    s
  );
}

function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return { url, anonKey };
}

function getActiveCompanyId(jar: CookieJar): string | null {
  const v = jar.get("active_company_id")?.value ?? jar.get("company_id")?.value ?? null;
  if (!v) return null;

  const trimmed = String(v).trim();
  return isUuid(trimmed) ? trimmed : null;
}

function safeGetAll(jar: CookieJar) {
  const anyJar: any = jar as any;
  if (typeof anyJar?.getAll === "function") return anyJar.getAll();
  return [];
}

async function tryGetCompanyName(companyId: string, jar: CookieJar): Promise<string | null> {
  try {
    const { url, anonKey } = getSupabaseEnv();
    if (!url || !anonKey) return null;

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return safeGetAll(jar);
        },
        setAll() {
          // Banner should not mutate cookies.
        },
      },
    });

    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .maybeSingle();

    if (error || !data) return null;

    const name = typeof (data as any).name === "string" ? (data as any).name.trim() : "";
    return name || null;
  } catch {
    return null;
  }
}

export default async function ActiveCompanyBanner() {
  const jar = cookies();
  const companyId = getActiveCompanyId(jar);

  if (!companyId) {
    return (
      <div className="rounded-2xl bg-white/80 px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm sm:text-base text-neutral-800">
            No active company selected. Go to the Companies page to choose one.
          </p>
          <Link
            href="/dashboard/companies"
            className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85]"
          >
            Select company
          </Link>
        </div>
      </div>
    );
  }

  const companyName = await tryGetCompanyName(companyId, jar);

  // Never show the UUID. Ever.
  const showName = companyName || "Selected";

  return (
    <div className="rounded-2xl bg-white/80 px-4 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-lg sm:text-xl text-[#0f3c85]">
            <span className="font-semibold">Active company:</span>{" "}
            <span className="font-bold">{showName}</span>
          </p>

          {!companyName ? (
            <p className="mt-1 text-xs sm:text-sm text-neutral-600">
              Active company is selected, but details could not be loaded.
            </p>
          ) : null}
        </div>

        <Link
          href="/dashboard/companies"
          className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85]"
        >
          Change company
        </Link>
      </div>
    </div>
  );
}
