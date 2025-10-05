"use client";

/* app/dashboard/settings/page.tsx
   Settings page: single grey tile (same vibe as dashboard tiles),
   wide as the header banner, reduced vertical padding, heavier labels.
   Field order: Company Name → PAYE Ref No → Accounts Ref No → Address → Contact.
*/

export default function SettingsPage() {
  return (
    <div className="flex-1 min-h-0">
      <form
        className="
          mx-auto w-full max-w-5xl
          rounded-2xl bg-neutral-200 ring-1 ring-neutral-300
          p-5 sm:p-6 space-y-5
        "
        onSubmit={(e) => {
          e.preventDefault();
          alert("Saved (placeholder). Wire to Supabase later.");
        }}
      >
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
          Company details
        </h2>

        {/* Top trio: Company, PAYE Ref, Accounts Ref */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-neutral-900">
              Company Name
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="WageFlow Ltd"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-900">
              PAYE Ref No
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123/AB45678"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-900">
              Accounts Ref No
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123PA00000000"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Address block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-neutral-900">
              Address line 1
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123 Example Street"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-neutral-900">
              Address line 2
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Suite 4B"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-900">
              City
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="London"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-900">
              Postcode
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="SW1A 1AA"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-neutral-900">
              Country
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="United Kingdom"
            />
          </div>
        </div>

        {/* Contact block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-900">
              Contact email
            </label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="payroll@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-900">
              Phone
            </label>
            <input
              type="tel"
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+44 20 7946 0000"
            />
          </div>
        </div>

        <div className="pt-1">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
