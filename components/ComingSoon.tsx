'use client';
import React from 'react';

type Props = { title?: string; note?: string };

export default function ComingSoon({ title = 'Coming soon', note = 'This page is disabled in Preview.' }: Props) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center bg-neutral-100">
      <div className="bg-white rounded-xl shadow p-8 max-w-xl w-[92%] text-center">
        <h1 className="text-2xl font-semibold mb-2">{title}</h1>
        <p className="text-neutral-600">{note}</p>
      </div>
    </div>
  );
}
