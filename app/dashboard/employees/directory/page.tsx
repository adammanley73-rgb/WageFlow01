/* app/dashboard/employees/directory/page.tsx
   Minimal placeholder. No HeaderBanner import, no strict props.
   Compiles cleanly for CI and keeps the visual style consistent.
*/

export default function EmployeesDirectoryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#11a36a] to-[#1565d8]">
      {/* Simple header card */}
      <header className="w-full flex justify-center pt-6">
        <div className="w-[92%] max-w-6xl bg-white rounded-2xl shadow-sm px-6 py-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1565d8]">
            Directory
          </h1>
        </div>
      </header>

      <main className="w-full flex justify-center py-8">
        <section className="w-[92%] max-w-6xl bg-neutral-200 rounded-2xl ring-1 ring-neutral-400 p-6">
          <div className="rounded-xl bg-white ring-1 ring-neutral-300 px-4 py-6">
            <h2 className="text-lg font-semibold text-neutral-900">Employee Directory</h2>
            <p className="mt-2 text-sm text-neutral-700">
              Directory is temporarily disabled while the local store is replaced with the
              Supabase-backed implementation.
            </p>
            <p className="mt-2 text-sm text-neutral-700">
              This placeholder keeps navigation and CI stable.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
