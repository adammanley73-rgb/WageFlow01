'use client';

import React from 'react';
import Link from 'next/link';

type Section = 'Dashboard' | 'Employees' | 'Payroll' | 'Absence' | 'Settings';

type HeaderBannerProps = {
  currentSection: Section;
};

export default function HeaderBanner({ currentSection }: HeaderBannerProps) {
  // Base nav model
  const base: { href: string; label: Section }[] = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/employees', label: 'Employees' },
    { href: '/dashboard/payroll', label: 'Payroll' },
    { href: '/dashboard/absence', label: 'Absence' },
    { href: '/dashboard/settings', label: 'Settings' },
  ];

  // Hide the chip for the current page.
  // Hide Settings unless we're on Dashboard.
  const links = base.filter(item => {
    if (item.label === currentSection) return false;
    if (item.label === 'Settings' && currentSection !== 'Dashboard') return false;
    return true;
  });

  return (
    <nav className="flex flex-wrap items-center justify-end gap-2">
      {links.map(link => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-700 ring-1 ring-neutral-300 hover:bg-neutral-100"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
