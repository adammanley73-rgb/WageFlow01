// C:\Users\adamm\Projects\wageflow01\app\dashboard\ai\page.tsx

import Link from "next/link";

import HeaderBanner from "@/components/ui/HeaderBanner";
import AICopilot from "@/components/ui/AICopilotTest";

export default function AICopilotPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1fc7a1] to-[#0f3c85] px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <HeaderBanner title="AI Copilot" currentSection="dashboard" />

        <div className="flex items-center">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#0f3c85] px-5 text-sm font-medium text-white hover:bg-[#0c326c] transition"
          >
            Back to Dashboard
          </Link>
        </div>

        <section className="mx-auto w-full">
          <div className="rounded-3xl bg-white/90 shadow-sm p-6">
            <AICopilot />
          </div>
        </section>
      </div>
    </main>
  );
}
