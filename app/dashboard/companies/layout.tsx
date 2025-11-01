// File: app/dashboard/companies/layout.tsx
// Minimal pass-through layout to avoid double headers on the Companies section.
export default function CompaniesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
