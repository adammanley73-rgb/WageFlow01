// C:\Users\adamm\Projects\wageflow01\app\privacy\page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | The Business Consortium Ltd",
  description: "Privacy Policy for WageFlow by The Business Consortium Ltd.",
};

const LAST_UPDATED = "24 February 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-3">Privacy Policy</h1>
        <p className="text-sm text-gray-600">Last updated: {LAST_UPDATED}</p>

        <div className="mt-10 space-y-10">
          <section className="space-y-3">
            <h2 className="text-2xl font-bold">1. Who we are</h2>
            <p className="text-gray-700">
              This website and the WageFlow service are operated by The Business Consortium Ltd (company number 16636529).
              Registered office: 86-90 Paul Street, London EC2A 4NE, United Kingdom. Contact: enquiries@thebusinessconsortiumltd.co.uk.
            </p>
            <p className="text-gray-700">
              This Privacy Policy explains what personal data we collect, why we collect it, how we use it, and your rights.
              Organisations must provide this type of information under UK GDPR transparency requirements. 
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">2. Controller and processor roles</h2>
            <p className="text-gray-700">
              Marketing website enquiries. For enquiries and communications you send to us, we act as a data controller.
            </p>
            <p className="text-gray-700">
              WageFlow payroll data. For payroll and employee data uploaded into WageFlow by a business customer, the customer typically acts as the data controller,
              and we act as a data processor processing that data on the customer’s instructions to provide the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">3. What data we collect</h2>
            <p className="text-gray-700">
              We may collect the following categories of data, depending on how you use the website or service.
            </p>

            <div className="grid gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <p className="font-semibold">Website enquiries</p>
                <p className="text-gray-700 mt-1">
                  Name, business name, email address, phone number if you provide it, and the contents of your message.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <p className="font-semibold">Account and service data</p>
                <p className="text-gray-700 mt-1">
                  Account identifiers, login and security metadata, company settings you enter, and support communications.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <p className="font-semibold">Payroll and employee data</p>
                <p className="text-gray-700 mt-1">
                  Data entered by the customer to run payroll, such as employee identifiers, payroll inputs and outputs, statutory calculations, and payroll history.
                  This data may include special category data depending on what the customer inputs.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <p className="font-semibold">Technical data</p>
                <p className="text-gray-700 mt-1">
                  IP address, device and browser information, and logs used for security and service reliability.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">4. Why we use personal data and lawful bases</h2>
            <p className="text-gray-700">
              UK GDPR requires us to explain purposes and lawful bases. The exact lawful basis depends on the context. 
              Typical lawful bases include contract, legal obligation, and legitimate interests. 
            </p>

            <div className="grid gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="font-semibold">Responding to enquiries</p>
                <p className="text-gray-700 mt-1">
                  Purpose: reply to your demo or pilot enquiries, and manage sales communications.
                  Lawful basis: legitimate interests, or steps to enter into a contract where relevant.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="font-semibold">Providing the service</p>
                <p className="text-gray-700 mt-1">
                  Purpose: provide payroll software functionality and customer support.
                  Lawful basis: contract where you are the customer. For payroll data processed for customers, we act as processor on the customer’s instructions.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="font-semibold">Security and fraud prevention</p>
                <p className="text-gray-700 mt-1">
                  Purpose: protect accounts, prevent abuse, investigate incidents.
                  Lawful basis: legitimate interests and, where applicable, legal obligations.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="font-semibold">Legal and compliance</p>
                <p className="text-gray-700 mt-1">
                  Purpose: comply with legal obligations, resolve disputes, and enforce terms.
                  Lawful basis: legal obligation and legitimate interests.
                </p>
              </div>
            </div>

            <p className="text-gray-700">
              If we rely on consent for any optional processing, we will tell you at the point of collection and you can withdraw consent at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">5. Who we share data with</h2>
            <p className="text-gray-700">
              We share personal data only where necessary to run the website or provide the service, for example with hosting, database, email, and security providers.
              We require appropriate contractual protections where processors are used.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">6. International transfers</h2>
            <p className="text-gray-700">
              If any service providers process data outside the UK, we will use appropriate safeguards, such as approved transfer mechanisms.
              If you require details of sub-processors or transfer safeguards, contact us.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">7. Data retention</h2>
            <p className="text-gray-700">
              We keep personal data only as long as needed for the purposes set out in this policy. Payroll records often need to be retained for statutory and operational reasons.
              Where we act as processor, retention may be controlled by the customer’s instructions, subject to legal requirements.
            </p>
            <p className="text-gray-700">
              Where appropriate, we may retain information longer for security, audit, and dispute resolution.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">8. Your rights</h2>
            <p className="text-gray-700">
              You may have rights including access, correction, deletion, restriction, objection, and data portability. Some rights depend on context and lawful basis.
              If we process payroll data as processor, we will assist the customer (controller) with requests where required.
            </p>
            <p className="text-gray-700">
              You also have the right to complain to the Information Commissioner’s Office (ICO). ICO expects privacy notices to explain rights and how to complain.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">9. Cookies</h2>
            <p className="text-gray-700">
              Cookies and similar technologies may be used to keep the site and service working, for example for authentication and security.
              UK rules require clear information and consent for non-essential cookies. Essential cookies do not require consent where strictly necessary for the service you request.
            </p>
            <p className="text-gray-700">
              If we add analytics or marketing cookies, we will provide a cookie notice and request consent before setting them.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">10. Contact</h2>
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