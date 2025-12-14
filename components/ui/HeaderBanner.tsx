// components/ui/HeaderBanner.tsx
// Simple server component used on dashboard-style pages.

import React from "react";

type HeaderBannerProps = {
  title: string;
};

export default function HeaderBanner({ title }: HeaderBannerProps) {
  return (
    <header className="bg-white px-6 py-4 rounded-b-xl flex items-center gap-4 shadow-sm">
      <div className="w-14 h-14 rounded-full bg-gradient-to-b from-emerald-400 to-blue-600 flex items-center justify-center">
        <span className="text-white font-bold text-sm">WageF</span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-[#111827]">{title}</h1>
    </header>
  );
}
