"use client";

import React from "react";

type Props = {
  title?: string;
  currentSection?: string;
};

/**
 * Stub HeaderBanner component.
 * Replace with your real version once deployment succeeds.
 */
export default function HeaderBanner({ title, currentSection }: Props) {
  return (
    <div className="w-full bg-white shadow p-4 mb-4">
      <h1 className="text-2xl font-bold text-blue-900">
        {title ?? currentSection ?? "Header"}
      </h1>
    </div>
  );
}
