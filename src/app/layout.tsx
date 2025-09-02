// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WageFlow',
  description: 'UK payroll manager',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
