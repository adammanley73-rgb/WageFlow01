/* app/dashboard/settings/page.tsx */
import PageTemplate from "@/components/layout/PageTemplate";

export default function SettingsPage() {
  return (
    <PageTemplate title="Settings" currentSection="settings">
      {/* Single centered card wrapper, identical to other pages */}
      <div className="rounded-2xl bg-neutral-100 ring-1 ring-neutral-300 p-4">
        <div className="rounded-xl bg-white ring-1 ring-neutral-200 p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">Company details</h2>

          <form className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Company Name */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800">Company Name</label>
              <input
                className="w-full rounded-lg ring-1 ring-neutral-300 px-3 py-2 bg-white"
                placeholder="WageFlow Ltd"
                defaultValue="WageFlow Ltd"
              />
            </div>

            {/* Accounts Ref No */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800">Accounts Ref No</label>
              <input
                className="w-full rounded-lg ring-1 ring-neutral-300 px-3 py-2 bg-white"
                placeholder="123PA00000000"
                defaultValue="123PA00000000"
              />
            </div>

            {/* PAYE Ref No */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800">PAYE Ref No</label>
              <input
                className="w-full rounded-lg ring-1 ring-neutral-300 px-3 py-2 bg-white"
                placeholder="123/AB45678"
                defaultValue="123/AB45678"
              />
            </div>

            {/* Address line 1 */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800">Address line 1</label>
              <input
                className="w-full rounded-lg ring-1 ring-neutral-300 px-3 py-2 bg-white"
                placeholder="123 Example Street"
                defaultValue="123 Example Street"
              />
            </div>

            {/* Address line 2 */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800">Address line 2</label>
              <input
                className="w-full rounded-lg ring-1 ring-neutral-300 px-3 py-2 bg-white"
                placeholder="Suite 4B"
                defaultValue="Suite 4B"
              />
            </div>

            {/* City */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800">City</label>
              <input
                className="w-full rounded-lg ring-1 ring-neutral-300 px-3 py-2 bg-white"
                placeholder="London"
                defaultValue="London"
              />
            </div>

            {/* Postcode */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800">Postcode</label>
              <input
                className="w-full rounded-lg ring-1 ring-neutral-300 px-3 py-2 bg-white"
                placeholder="SW1A 1AA"
                defaultValue="SW1A 1AA"
              />
            </div>

            {/* Country */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800">Country</label>
              <input
                className="w-full rounded-lg ring-1 ring-neutral-300 px-3 py-2 bg-white"
                placeholder="United Kingdom"
                defaultValue="United Kingdom"
              />
            </div>

            {/* Contact email */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800">Contact email</label>
              <input
                type="email"
                className="w-full rounded-lg ring-1 ring-neutral-300 px-3 py-2 bg-white"
                placeholder="payroll@example.com"
                defaultValue="payroll@example.com"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800">Phone</label>
              <input
                className="w-full rounded-lg ring-1 ring-neutral-300 px-3 py-2 bg-white"
                placeholder="+44 20 7946 0000"
                defaultValue="+44 20 7946 0000"
              />
            </div>
          </form>
        </div>
      </div>
    </PageTemplate>
  );
}
