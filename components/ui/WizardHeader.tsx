'use client';

import Link from 'next/link';
import HeaderBanner from '@/components/ui/HeaderBanner';

type Props = {
  employeeId: string;
  current: 'starter' | 'bank' | 'emergency';
};

export default function WizardHeader({ employeeId, current }: Props) {
  const base = `/dashboard/employees/${employeeId}/wizard`;

  const steps: Array<{ key: Props['current']; label: string; href: string }> = [
    { key: 'starter', label: 'Starter details', href: `${base}/starter` },
    { key: 'bank', label: 'Bank details', href: `${base}/bank` },
    { key: 'emergency', label: 'Emergency contact', href: `${base}/emergency` },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <HeaderBanner currentSection="Employees" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-semibold">New Employee Wizard</div>
        <nav className="flex flex-wrap gap-2">
          {steps.map(s => {
            const active = s.key === current;
            return (
              <Link
                key={s.key}
                href={s.href}
                className={[
                  'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm ring-1',
                  active
                    ? 'bg-[#1e40af] text-white ring-[#1e40af]'
                    : 'bg-neutral-100 text-neutral-800 ring-neutral-300 hover:bg-neutral-200',
                ].join(' ')}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
