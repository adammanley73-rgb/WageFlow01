/* @ts-nocheck */
import React from 'react';
import ComingSoon from '@/components/ComingSoon';
import { env } from '@/lib/env';

export default function Page() {
  if (env.preview) {
    return <ComingSoon title="Absence" note="Absence will unlock when build profile is prod." />;
  }

  // Real implementation placeholder for future
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Absence</h1>
      <p className="text-neutral-600">This is where the absence management UI will go.</p>
    </div>
  );
}

