/* app/dashboard/settings/page.tsx */
import PageTemplate from "@/components/layout/PageTemplate";

export default function SettingsPage() {
  return (
    <PageTemplate
      title="Settings"
      currentSection="Settings"
      stats={[]}
      actions={[]}
    >
      <div className="rounded-xl bg-white ring-1 ring-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900">Company details</h2>
        <form className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-700">Company name</span>
            <input className="h-10 rounded-md border border-neutral-300 px-3" placeholder="The Business Consortium Ltd" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-700">PAYE reference</span>
            <input className="h-10 rounded-md border border-neutral-300 px-3" placeholder="123/AB456" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-700">Accounts office ref</span>
            <input className="h-10 rounded-md border border-neutral-300 px-3" placeholder="123PA00012345" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-700">Address line 1</span>
            <input className="h-10 rounded-md border border-neutral-300 px-3" placeholder="1 Example Street" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-700">City</span>
            <input className="h-10 rounded-md border border-neutral-300 px-3" placeholder="Derby" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-700">Postcode</span>
            <input className="h-10 rounded-md border border-neutral-300 px-3" placeholder="DE1 1AA" />
          </label>
          <div className="sm:col-span-2 mt-2 flex justify-end">
            <button type="button" className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-white text-sm hover:-translate-y-0.5 transition-transform">
              Save
            </button>
          </div>
        </form>
      </div>
    </PageTemplate>
  );
}
