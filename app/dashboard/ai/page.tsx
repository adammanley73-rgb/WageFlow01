// C:\Users\adamm\Projects\wageflow01\app\dashboard\ai\page.tsx

import HeaderBanner from "@/components/ui/HeaderBanner";
import AICopilotTest from "@/components/ui/AICopilotTest";

export default function AIDashboardTestPage() {
return (
<main className="min-h-screen bg-gradient-to-br from-[#1fc7a1] to-[#0f3c85] px-4 py-4 sm:px-6 sm:py-6">
<div className="mx-auto max-w-6xl space-y-6">
<HeaderBanner title="AI Copilot test" currentSection="dashboard" />

    <section className="mx-auto w-full">
      <div className="rounded-3xl bg-white/90 shadow-sm p-6">
        <AICopilotTest />
      </div>
    </section>
  </div>
</main>


);
}