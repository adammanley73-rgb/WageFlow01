/* app/dashboard/companies/layout.tsx */
import type { ReactNode } from "react";
import Image from "next/image";

export default function CompaniesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#11a36a] to-[#1565d8]">
      {/* Header with no nav chips */}
      <header className="w-full flex justify-center pt-6">
        <div className="w-[92%] max-w-6xl bg-white rounded-2xl shadow-sm px-6 py-4 flex items-center gap-4">
          <div className="shrink-0">
            <Image
              src="/wageflow-logo.png"
              alt="WageFlow"
              width={64}
              height={64}
              className="h-16 w-16 object-contain"
              priority
            />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1565d8]">
            Companies
          </h1>
          {/* No nav chips here */}
        </div>
      </header>

      <main className="w-full flex justify-center py-8">
        <div className="w-[92%] max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
