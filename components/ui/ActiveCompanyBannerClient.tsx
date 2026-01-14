// C:\Users\adamm\Projects\wageflow01\components\ui\ActiveCompanyBannerClient.tsx
"use client";

import Link from "next/link";

type Props = {
  loading?: boolean;
  companyName?: string | null;
  errorText?: string | null;
};

export default function ActiveCompanyBannerClient(props: Props) {
  const loading = Boolean(props.loading);
  const companyName = props.companyName ?? null;
  const errorText = props.errorText ?? null;

  const showName = !loading && !!companyName;
  const showError = !loading && !companyName;

  return (
    <div className="rounded-2xl bg-white/80 px-4 py-4">
      {loading ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm sm:text-base text-neutral-800">Loading active company…</p>
        </div>
      ) : showName ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg sm:text-xl text-[#0f3c85]">
            <span className="font-semibold">Active company:</span>{" "}
            <span className="font-bold">{companyName}</span>
          </p>
          <Link
            href="/dashboard/companies"
            className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85]"
          >
            Change company
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm sm:text-base text-neutral-800">
            {errorText || "No active company selected. Go to the Companies page to choose one."}
          </p>
          <Link
            href="/dashboard/companies"
            className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f3c85]"
          >
            Select company
          </Link>
        </div>
      )}
    </div>
  );
}
