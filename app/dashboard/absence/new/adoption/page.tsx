/* app/dashboard/absence/new/adoption/page.tsx
   Minimal placeholder. No HeaderBanner import, no strict props.
*/

export default function NewAdoptionLeavePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#11a36a] to-[#1565d8]">
      {/* Simple header card */}
      <header className="w-full flex justify-center pt-6">
        <div className="w-[92%] max-w-6xl bg-white rounded-2xl shadow-sm px-6 py-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1565d8]">
            New Adoption Leave
          </h1>
        </div>
      </header>

      <main className="w-full flex justify-center py-8">
        <section className="w-[92%] max-w-6xl bg-neutral-200 rounded-2xl ring-1 ring-neutral-400 p-6">
          <div className="rounded-xl bg-white ring-1 ring-neutral-300 px-4 py-6 space-y-3">
            <p className="text-sm text-gray-700">
              Preview stub. Adoption leave wizard is disabled in this build.
            </p>
            <p className="text-sm text-gray-700">
              This route stays in place so CI and navigation remain consistent while Absence flows are implemented.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
