import type { Metadata } from "next";

const siteUrl = "https://www.thebusinessconsortiumltd.co.uk";
const pageUrl = `${siteUrl}/payroll-software-for-small-business.html`;
const title = "Payroll Software for Small Business UK | WageFlow";
const description =
  "WageFlow is payroll software for small businesses in the UK, built to help SMEs review PAYE, NI, payroll exceptions, starters, leavers, payslips and approval before payday.";

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
  description,
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title,
    description,
    url: pageUrl,
    siteName: "WageFlow by The Business Consortium Ltd",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: title,
      description,
      about: {
        "@id": `${siteUrl}/#wageflow`,
      },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: `${siteUrl}/wageflow-screenshot.png`,
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#wageflow`,
      name: "WageFlow",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Payroll software",
      operatingSystem: "Web",
      url: siteUrl,
      image: `${siteUrl}/wageflow-screenshot.png`,
      description:
        "WageFlow is UK payroll software for small businesses that want clearer payroll review, PAYE and NI visibility, exception-led checks and approval control before payday.",
      provider: {
        "@id": `${siteUrl}/#organization`,
      },
      audience: {
        "@type": "Audience",
        audienceType: "UK small businesses and SMEs",
      },
      featureList: [
        "Payroll software for small business UK",
        "PAYE and National Insurance review",
        "Payroll exception checks",
        "Starter and leaver workflow",
        "Payslip visibility",
        "Absence and holiday tracking",
        "Payroll audit trail",
        "Payroll approval support",
      ],
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "The Business Consortium Ltd",
      legalName: "The Business Consortium Ltd",
      url: siteUrl,
      email: "enquiries@thebusinessconsortiumltd.co.uk",
      logo: `${siteUrl}/WageFlowLogo.png`,
    },
    {
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "What payroll software do small businesses need in the UK?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Small businesses in the UK need payroll software that supports PAYE, National Insurance, payslips, starters, leavers, deductions, payroll records and review before approval.",
          },
        },
        {
          "@type": "Question",
          name: "Is WageFlow suitable for small businesses?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. WageFlow is built for UK SMEs and small businesses that want clearer payroll workflow, exception review and calmer approval before payday.",
          },
        },
        {
          "@type": "Question",
          name: "Can WageFlow help reduce payroll errors?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "WageFlow is designed to help users review exceptions, PAYE, NI, totals and payroll movements before approval, reducing avoidable payroll mistakes.",
          },
        },
        {
          "@type": "Question",
          name: "Can small businesses request a WageFlow demo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Small businesses can request a WageFlow demo or apply for the pilot programme through The Business Consortium Ltd website.",
          },
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${pageUrl}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Payroll Software for Small Business UK",
          item: pageUrl,
        },
      ],
    },
  ],
};

const problems = [
  "Payroll takes too long because too much is checked manually",
  "PAYE, NI, starters, leavers and deductions are reviewed in separate places",
  "Mistakes are often found after approval instead of before payday",
  "Payroll records are hard to explain when someone asks what changed",
  "Small teams need control without buying a bloated enterprise system",
];

const benefits = [
  "Review exceptions before payroll approval",
  "Keep PAYE and National Insurance checks visible",
  "Handle starters, leavers, absence and payslip workflow more clearly",
  "Use a cleaner audit trail for payroll changes and approvals",
  "Reduce preventable corrections after payday",
  "Give small business payroll a repeatable review process",
];

const workflow = [
  {
    title: "Add your payroll data",
    text: "Set up company details, employee records, pay schedules and the information needed to run payroll properly.",
  },
  {
    title: "Run payroll and review exceptions",
    text: "WageFlow helps surface areas that need attention so you can review the run before approval.",
  },
  {
    title: "Approve with confidence",
    text: "Payroll approval should be deliberate, visible and easier to explain later. Not a hopeful click into the void.",
  },
];

const faqs = [
  {
    question: "What is payroll software for small business UK?",
    answer:
      "It is software that helps UK small businesses process payroll, calculate payroll deductions, prepare payslips, review PAYE and National Insurance, and keep records for payroll approval.",
  },
  {
    question: "Why should a small business use WageFlow?",
    answer:
      "WageFlow is built to make payroll review clearer by focusing attention on exceptions, movement, approval and audit trail visibility before payday.",
  },
  {
    question: "Does WageFlow support PAYE and NI checks?",
    answer:
      "WageFlow is designed around UK payroll workflow, including PAYE and National Insurance visibility before payroll approval.",
  },
  {
    question: "Is there a pilot programme?",
    answer:
      "The first 10 companies can apply for a guided parallel run and 3 months free, subject to the current pilot programme terms.",
  },
];

export default function SmallBusinessPayrollSoftwarePage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
          <a href="/" className="flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3c85]">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-blue-100 bg-white">
              <img src="/WageFlowLogo.png" alt="WageFlow logo" className="h-9 w-9 object-contain" />
            </span>
            <span>
              <span className="block text-xl font-bold text-[#0f3c85]">WageFlow</span>
              <span className="block text-xs text-gray-600">by The Business Consortium Ltd</span>
            </span>
          </a>

          <a
            href="/#contact"
            className="hidden rounded-lg bg-[#0f3c85] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#0f3c85] sm:inline-flex"
          >
            Request a demo
          </a>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-[#0f3c85]">
              Payroll software for small business UK
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight text-gray-950 sm:text-5xl lg:text-6xl">
              Payroll software for small businesses that want fewer payday surprises
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-700">
              WageFlow helps UK small businesses review payroll before approval, with clearer visibility over PAYE, National Insurance, payroll exceptions, starters, leavers, payslips and audit trail. It is built for SMEs that need payroll control without turning payday into a weekly séance.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="/#contact"
                className="inline-flex items-center justify-center rounded-lg bg-[#0f3c85] px-8 py-4 text-base font-semibold text-white transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Request a demo
              </a>
              <a
                href="/#pricing"
                className="inline-flex items-center justify-center rounded-lg border-2 border-gray-300 px-8 py-4 text-base font-semibold text-gray-900 transition hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                See pricing
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#0f3c85]">Built for SMEs</p>
            <h2 className="mt-3 text-2xl font-bold text-gray-950">Keep payroll review clear before payday</h2>
            <p className="mt-3 text-gray-700">
              Small business payroll still needs proper checks. WageFlow helps focus attention on the run before approval, not after someone spots the mistake.
            </p>
            <div className="mt-6 grid gap-3">
              {benefits.slice(0, 4).map((benefit) => (
                <div key={benefit} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-900">
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">Why small businesses need clearer payroll software</h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              Payroll is not less important because the company is smaller. A small business still needs accurate pay, visible deductions, payslips, PAYE, NI and a clean approval process.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {problems.map((problem) => (
              <div key={problem} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="font-semibold text-gray-950">{problem}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">What WageFlow helps small businesses do</h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow gives SMEs a more controlled route through payroll preparation, review and approval.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="font-semibold text-gray-950">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">A simple payroll workflow for SMEs</h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow is designed to help small businesses move from payroll setup to exception review and approval with fewer blind spots.
            </p>
            <a
              href="/#contact"
              className="mt-8 inline-flex rounded-lg bg-[#0f3c85] px-7 py-4 font-semibold text-white transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
            >
              Request a demo
            </a>
          </div>

          <div className="grid gap-5">
            {workflow.map((step, index) => (
              <article key={step.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-bold text-[#0f3c85]">Step {index + 1}</p>
                <h3 className="mt-2 text-xl font-bold text-gray-950">{step.title}</h3>
                <p className="mt-3 leading-7 text-gray-700">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">Small business payroll software FAQs</h2>
            <p className="mt-4 text-lg text-gray-700">Straight answers for SMEs that want payroll to stop being a monthly guessing game.</p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-950">{faq.question}</h3>
                <p className="mt-3 leading-7 text-gray-700">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0f3c85] px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Review WageFlow for your small business payroll</h2>
          <p className="mt-4 text-lg leading-8 text-blue-50">
            Request a demo, review pricing or apply for the pilot programme if you want a guided parallel run before live payroll.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="/#contact"
              className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 font-semibold text-[#0f3c85] transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white"
            >
              Request a demo
            </a>
            <a
              href="/uk-payroll-software.html"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white px-8 py-4 font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-white"
            >
              View UK payroll software page
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}