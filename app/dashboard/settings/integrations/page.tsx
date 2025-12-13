/* C:\Users\adamm\Projects\wageflow01\app\dashboard\settings\integrations\page.tsx */
import React from "react";

const S = {
  page: { maxWidth: "72rem", margin: "0 auto" },
  wrap: { background: "white", borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.5rem" },
  grid: { display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" },
  card: { border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem" }
};

export default function SettingsIntegrationsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-500 to-blue-700 px-4 py-6 md:px-8 lg:px-12">
      {/* Minimal header card to avoid HeaderBanner prop requirements */}
      <div className="w-full bg-white border-b border-neutral-200 px-6 py-4 rounded-t-xl">
        <h1 className="text-xl font-semibold text-blue-700">Settings</h1>
      </div>

      <main style={S.page}>
        <div style={S.wrap}>
          <section style={S.grid} aria-labelledby="int-title">
            <h2 id="int-title" style={{ position: "absolute", left: -9999 }}>Integrations</h2>

            <div style={S.card}>
              <h3 className="text-sm font-medium text-neutral-900">Supabase</h3>
              <p className="mt-1 text-sm text-neutral-700">Primary data store. Config managed via env vars.</p>
              <button className="mt-2 inline-flex items-center rounded-md bg-blue-700 px-3 py-1.5 text-white text-sm disabled:opacity-60" disabled>
                Configure (disabled)
              </button>
            </div>

            <div style={S.card}>
              <h3 className="text-sm font-medium text-neutral-900">Vercel</h3>
              <p className="mt-1 text-sm text-neutral-700">Deploys via GitHub. Build settings locked to Node 20.</p>
              <button className="mt-2 inline-flex items-center rounded-md bg-blue-700 px-3 py-1.5 text-white text-sm disabled:opacity-60" disabled>
                View settings (disabled)
              </button>
            </div>

            <div style={S.card}>
              <h3 className="text-sm font-medium text-neutral-900">Stripe</h3>
              <p className="mt-1 text-sm text-neutral-700">Billing not wired in this preview build.</p>
              <button className="mt-2 inline-flex items-center rounded-md bg-blue-700 px-3 py-1.5 text-white text-sm disabled:opacity-60" disabled>
                Connect (disabled)
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
