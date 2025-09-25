/* @ts-nocheck */
import React from "react";

export default function HeaderBanner({ title }: { title?: string }) {
  return (
    <div className="w-full bg-gray-200 py-4 px-6 rounded-b-lg shadow">
      <h1 className="text-xl font-bold text-gray-800">
        {title || "HeaderBanner stub"}
      </h1>
    </div>
  );
}
