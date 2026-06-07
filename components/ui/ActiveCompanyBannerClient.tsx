// C:\Projects\wageflow01\components\ui\ActiveCompanyBannerClient.tsx
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

  return (
    <div className="rounded-2xl bg-white/80 px-4 py-4">
      {loading ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-800 sm:text-base">Loading active company...</p>
        </div>
      ) : showName ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg text-[#0f3c85] sm:text-xl">
            <span className="font-semibold">Active company:</span>{" "}
            <span className="font-bold">{companyName}</span>
          </p>
          <Link
            href="/dashboard/companies"
            className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f3c85] focus-visible:ring-offset-2"
          >
            Change company
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-800 sm:text-base">
            {errorText || "No active company selected. Go to the Companies page to choose one."}
          </p>
          <Link
            href="/dashboard/companies"
            className="inline-flex items-center justify-center rounded-full bg-[#0f3c85] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c2f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f3c85] focus-visible:ring-offset-2"
          >
            Review company
          </Link>
        </div>
      )}
    </div>
  );
}
