// C:\Users\adamm\Projects\wageflow01\app\terms\page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | The Business Consortium Ltd",
  description: "Terms of Service for WageFlow by The Business Consortium Ltd.",
};

const LAST_UPDATED = "24 February 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-3">Terms of Service</h1>
        <p className="text-sm text-gray-600">Last updated: {LAST_UPDATED}</p>

        <div className="mt-10 space-y-10">
          <section className="space-y-3">
            <h2 className="text-2xl font-bold">1. Who we are</h2>
            <p className="text-gray-700">
              WageFlow is operated by The Business Consortium Ltd (company number 16636529). Registered office:
              86-90 Paul Street, London EC2A 4NE, United Kingdom. Contact: enquiries@thebusinessconsortiumltd.co.uk.
            </p>
            <p className="text-gray-700">
              These Terms apply to business users. If you are not acting for a business, do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">2. Acceptance</h2>
            <p className="text-gray-700">
              By accessing or using WageFlow, you agree to these Terms. If you do not agree, you must not use the Service.
            </p>
            <p className="text-gray-700">
              If you use WageFlow on behalf of an organisation, you confirm you have authority to bind that organisation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">3. The Service</h2>
            <p className="text-gray-700">
              WageFlow is payroll software designed for UK payroll workflows. Features may include payroll calculations, run review,
              payslip generation, reporting, exports, and workflow tools.
            </p>
            <p className="text-gray-700">
              The Service is provided as software. You remain responsible for reviewing outputs and making payroll decisions.
            </p>
            <p className="text-xs text-gray-600">
              Not affiliated with or endorsed by HMRC.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">4. Accounts and security</h2>
            <p className="text-gray-700">
              You must keep login credentials confidential and take reasonable steps to prevent unauthorised access. You are responsible for
              activity under your account unless caused by our breach of security obligations.
            </p>
            <p className="text-gray-700">
              You must provide accurate account information and keep it up to date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">5. Subscriptions, fees, and taxes</h2>
            <p className="text-gray-700">
              The Service is offered on subscription plans. Plan details and pricing are shown on the WageFlow website and may change over time.
            </p>
            <p className="text-gray-700">
              Fees are billed monthly or annually in advance, depending on the plan you choose. Prices are shown excluding VAT unless stated otherwise.
              If VAT applies, it will be added at checkout.
            </p>
            <p className="text-gray-700">
              If payment fails, we may suspend access until payment is brought up to date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">6. Trials, pilots, and offers</h2>
            <p className="text-gray-700">
              From time to time we may offer pilots, parallel runs, trials, or discounts. Any such offer is subject to its stated conditions and may be withdrawn
              if misused or if we reasonably need to do so.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">7. Your responsibilities</h2>
            <p className="text-gray-700">
              You are responsible for the accuracy and legality of the data you input, and for verifying payroll outputs before approval and payment.
            </p>
            <p className="text-gray-700">
              You are responsible for meeting legal obligations as an employer, including paying employees and making submissions and payments to HMRC when due.
            </p>
            <p className="text-gray-700">
              You must not misuse the Service, attempt unauthorised access, interfere with operation, or reverse engineer the Service except where permitted by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">8. Data protection</h2>
            <p className="text-gray-700">
              For payroll data you upload, you will typically act as the data controller and we will act as a data processor, processing data on your instructions
              to provide the Service. Details are set out in the Privacy Policy.
            </p>
            <p className="text-gray-700">
              Payroll data usually has a lawful basis other than consent. You should not rely on employee consent unless you have a specific reason to do so.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">9. Data retention and exports</h2>
            <p className="text-gray-700">
              Payroll records often need to be retained for statutory and operational reasons. By default, we aim to retain payroll run history for at least 6 complete
              tax years, unless we are legally required to keep it longer, or unless a shorter retention is agreed in writing where lawful.
            </p>
            <p className="text-gray-700">
              If you cancel, you will have a reasonable period to export your data. After that, we may delete or anonymise data, except where retention is required by law
              or necessary for legitimate purposes such as dispute resolution and security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">10. Service availability and changes</h2>
            <p className="text-gray-700">
              We aim to keep the Service available and reliable, but we do not guarantee uninterrupted access. We may perform maintenance and updates.
            </p>
            <p className="text-gray-700">
              We may change features to improve the Service, meet legal requirements, or protect users. If we make a material change that substantially reduces core functionality,
              we will take reasonable steps to notify you.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">11. Intellectual property</h2>
            <p className="text-gray-700">
              We own the Service, its software, and branding. You are granted a limited, non-exclusive, non-transferable right to use the Service during your subscription.
            </p>
            <p className="text-gray-700">
              You retain ownership of your data. We do not claim ownership over your payroll or employee data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">12. Suspension and termination</h2>
            <p className="text-gray-700">
              You can cancel in accordance with your plan settings. We may suspend or terminate access if you breach these Terms, fail to pay, use the Service unlawfully,
              or if we must do so to comply with law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">13. Liability</h2>
            <p className="text-gray-700">
              Nothing in these Terms excludes liability that cannot be excluded by law, including liability for death or personal injury caused by negligence, fraud, or fraudulent misrepresentation.
            </p>
            <p className="text-gray-700">
              Subject to the above, we are not liable for indirect or consequential losses, or for losses that arise from your failure to review and approve payroll outputs before payment.
            </p>
            <p className="text-gray-700">
              Our total liability for all claims in any 12 month period is limited to the fees you paid for the Service in that 12 month period.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">14. Indemnity</h2>
            <p className="text-gray-700">
              You will indemnify us for losses arising from your unlawful use of the Service, your breach of these Terms, or your breach of applicable law, to the extent caused by you.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">15. Governing law</h2>
            <p className="text-gray-700">
              These Terms are governed by the laws of England and Wales. The courts of England and Wales have exclusive jurisdiction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">16. Contact</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <p className="font-semibold">The Business Consortium Ltd</p>
              <p className="text-gray-700">86-90 Paul Street</p>
              <p className="text-gray-700">London EC2A 4NE</p>
              <p className="text-gray-700 mt-2">Email: enquiries@thebusinessconsortiumltd.co.uk</p>
              <p className="text-gray-700">Company No: 16636529</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <a href="/" className="text-blue-600 hover:text-blue-700 font-semibold">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}